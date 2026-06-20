import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  appendCalculatorRoutineCompletionSignal,
  buildCalculatorRoutineCompletionSignal,
  CALCULATOR_ROUTINE_COMPLETION_STORAGE_KEY,
  CALCULATOR_ROUTINE_MISTAKE_OPTIONS,
  CALCULATOR_ROUTINE_SESSION_STORAGE_PREFIX,
  CALCULATOR_ROUTINE_STEPS,
  CALCULATOR_ROUTINE_VERIFICATION_OPTIONS,
  createCalculatorRoutineDraft,
  getCalculatorRoutineDraftStorageKey,
  getCalculatorRoutineEligibility,
  getCalculatorRoutineProgress,
  normalizeCalculatorRoutineMistakeTypes,
  parseCalculatorRoutineCompletionHistory,
  parseCalculatorRoutineDraftFromSession,
  serializeCalculatorRoutineCompletionHistoryForLocalStorage,
  serializeCalculatorRoutineDraftForSession,
  updateCalculatorRoutineDraftCurrentStep,
  updateCalculatorRoutineDraftStep,
} from "../lib/review-os/calculator-routine.ts";

const read = (path) => readFileSync(path, "utf8");

const textStepEntries = {
  conditions: "RAW_CONDITION_SENTINEL 원문 조건 12345",
  formula: "RAW_FORMULA_SENTINEL 수익환원 산식",
  numbers_units: "RAW_NUMBER_SENTINEL 1,234 원/㎡",
  casio_input: "RAW_CASIO_SENTINEL MENU 1 EXE",
  display_value: "RAW_DISPLAY_SENTINEL 987.65",
  answer_value: "RAW_ANSWER_SENTINEL 988원",
  unit_rounding: "RAW_UNIT_SENTINEL 천원 단위 반올림",
};

function completeDraft() {
  let draft = createCalculatorRoutineDraft({
    source: "problem-snap",
    examMode: "second",
    subject: "감정평가실무",
    routineId: "routine-test-1",
    now: "2026-06-20T00:00:00.000Z",
  });
  for (const [stepId, value] of Object.entries(textStepEntries)) {
    draft = updateCalculatorRoutineDraftStep(draft, stepId, value, "2026-06-20T00:01:00.000Z");
  }
  return {
    ...draft,
    verificationMethods: ["unit_check", "source_recheck"],
    mistakeTypes: ["casio_input", "rounding"],
    hintUsedStepIds: ["formula", "casio_input"],
    entries: {
      ...draft.entries,
      verification: "RAW_VERIFY_MEMO_SENTINEL 역산 확인",
      mistake_type: "RAW_MISTAKE_MEMO_SENTINEL 입력 오류",
    },
  };
}

test("calculator routine model has the required nine ordered steps and deterministic progress", () => {
  assert.deepEqual(
    CALCULATOR_ROUTINE_STEPS.map((step) => [step.id, step.label]),
    [
      ["conditions", "조건 정리"],
      ["formula", "산식 선택"],
      ["numbers_units", "숫자/단위 확인"],
      ["casio_input", "CASIO 입력"],
      ["display_value", "화면값 확인"],
      ["answer_value", "답안 기재값 확인"],
      ["unit_rounding", "단위/반올림 확인"],
      ["verification", "검산 완료"],
      ["mistake_type", "실수 유형 저장"],
    ],
  );
  assert.equal(CALCULATOR_ROUTINE_STEPS.length, 9);
  assert.ok(CALCULATOR_ROUTINE_VERIFICATION_OPTIONS.some((option) => option.id === "reverse_calculation"));
  assert.ok(CALCULATOR_ROUTINE_MISTAKE_OPTIONS.some((option) => option.id === "none"));

  let draft = createCalculatorRoutineDraft({
    source: "answer-review",
    examMode: "second",
    subject: "감정평가실무",
    now: "2026-06-20T00:00:00.000Z",
  });
  assert.equal(getCalculatorRoutineProgress(draft).completedCount, 0);
  assert.throws(() => buildCalculatorRoutineCompletionSignal(draft), /calculator-routine-incomplete/);

  draft = updateCalculatorRoutineDraftStep(draft, "conditions", "조건 A", "2026-06-20T00:01:00.000Z");
  draft = updateCalculatorRoutineDraftCurrentStep(draft, "formula", "2026-06-20T00:02:00.000Z");
  draft = updateCalculatorRoutineDraftStep(draft, "formula", "산식 B", "2026-06-20T00:03:00.000Z");
  draft = updateCalculatorRoutineDraftCurrentStep(draft, "conditions", "2026-06-20T00:04:00.000Z");
  assert.equal(draft.entries.conditions, "조건 A", "Back/Edit should preserve existing draft data");
  assert.equal(draft.entries.formula, "산식 B", "Back/Edit should not erase another completed step");
});

test("verification and mistake type requirements are enforced", () => {
  const almostComplete = {
    ...completeDraft(),
    verificationMethods: [],
  };
  assert.throws(() => buildCalculatorRoutineCompletionSignal(almostComplete), /calculator-routine-incomplete|missing-verification/);

  const missingMistake = {
    ...completeDraft(),
    mistakeTypes: [],
  };
  assert.throws(() => buildCalculatorRoutineCompletionSignal(missingMistake), /calculator-routine-incomplete|missing-mistake/);

  assert.deepEqual(normalizeCalculatorRoutineMistakeTypes(["none", "rounding", "casio_input"]), ["none"]);
  assert.deepEqual(normalizeCalculatorRoutineMistakeTypes(["rounding", "rounding", "other"]), ["rounding", "other"]);
});

test("completion signal is metadata-only and reuses the concept-node calculator routine candidate", () => {
  const signal = buildCalculatorRoutineCompletionSignal(completeDraft(), "2026-06-20T00:30:00.000Z");

  assert.equal(signal.metadataOnly, true);
  assert.equal(signal.routineType, "calculator_routine");
  assert.equal(signal.examMode, "second");
  assert.equal(signal.subject, "감정평가실무");
  assert.equal(signal.sourceStatus, "draft");
  assert.equal(signal.needsOfficialVerification, true);
  assert.equal(signal.routineConceptCandidate.metadataOnly, true);
  assert.equal(signal.routineConceptCandidate.conceptFamily, "검산/CASIO");
  assert.equal(signal.routineConceptCandidate.nextTaskType, "calculator_routine");
  assert.equal(signal.routineConceptCandidate.sourceStatus, "draft");
  assert.equal(signal.routineConceptCandidate.needsOfficialVerification, true);

  const serialized = JSON.stringify(signal);
  [
    "RAW_CONDITION_SENTINEL",
    "RAW_FORMULA_SENTINEL",
    "RAW_NUMBER_SENTINEL",
    "RAW_CASIO_SENTINEL",
    "RAW_DISPLAY_SENTINEL",
    "RAW_ANSWER_SENTINEL",
    "RAW_UNIT_SENTINEL",
    "RAW_VERIFY_MEMO_SENTINEL",
    "RAW_MISTAKE_MEMO_SENTINEL",
    "problemText",
    "answerText",
    "userAnswer",
    "officialAnswer",
    "raw",
  ].forEach((token) => assert.equal(serialized.includes(token), false, `raw token leaked: ${token}`));
});

test("draft and completion storage helpers keep raw and metadata scopes separate", () => {
  const draft = completeDraft();
  const rawSessionDraft = serializeCalculatorRoutineDraftForSession(draft);
  assert.ok(getCalculatorRoutineDraftStorageKey(draft.routineId).startsWith(CALCULATOR_ROUTINE_SESSION_STORAGE_PREFIX));
  assert.ok(rawSessionDraft.includes("RAW_CASIO_SENTINEL"), "raw draft is session-scoped only");
  assert.equal(parseCalculatorRoutineDraftFromSession("{bad json"), null);
  assert.equal(parseCalculatorRoutineDraftFromSession(rawSessionDraft)?.entries.casio_input, textStepEntries.casio_input);

  const signal = buildCalculatorRoutineCompletionSignal(draft, "2026-06-20T00:30:00.000Z");
  const oversized = Array.from({ length: 55 }, (_, index) => ({ ...signal, routineId: `routine-${index}` }));
  const capped = appendCalculatorRoutineCompletionSignal(oversized, signal);
  assert.equal(capped.length, 50);
  assert.equal(CALCULATOR_ROUTINE_COMPLETION_STORAGE_KEY, "inverge.calculatorRoutine.completions.v1");
  assert.deepEqual(parseCalculatorRoutineCompletionHistory("{bad json"), []);
  assert.equal(serializeCalculatorRoutineCompletionHistoryForLocalStorage(capped).includes("RAW_CASIO_SENTINEL"), false);
});

test("eligibility is limited to second exam practice and ignores placeholder calculator fallbacks", () => {
  assert.equal(getCalculatorRoutineEligibility({ examMode: "first", subject: "감정평가실무" }).eligible, false);
  assert.equal(getCalculatorRoutineEligibility({ examMode: "second", subject: "감정평가이론" }).manualEligible, false);

  const placeholderOnly = getCalculatorRoutineEligibility({
    examMode: "second",
    subject: "감정평가실무",
    formulas: ["확인 필요"],
    extractedNumbersAndUnits: ["없음"],
    calculatorGuide: {
      calculationPurpose: "검토 필요",
      recommendedMode: "검토 필요",
      keystrokeSteps: ["계산기 입력 없음"],
      expectedDisplay: "확인 필요",
      answerRounding: "해당 없음",
    },
  });
  assert.equal(placeholderOnly.eligible, false);
  assert.equal(placeholderOnly.manualEligible, true);

  const strongSignal = getCalculatorRoutineEligibility({
    examMode: "second",
    subject: "감정평가실무",
    calculatorGuide: {
      recommendedMode: "RUN-MAT",
      keystrokeSteps: ["100 × 0.05 EXE"],
    },
  });
  assert.equal(strongSignal.eligible, true);
});

test("trainer component enforces attempt-before-reveal without prefilling entries", () => {
  const component = read("components/review-os/calculator-routine-trainer.tsx");

  assert.ok(component.includes("data-calculator-routine-trainer"));
  assert.ok(component.includes("계산·검산 루틴"));
  assert.ok(component.includes("계산·검산 루틴 시작"));
  assert.ok(component.includes("정답 판정이 아니라 내 계산 과정을 점검하는 훈련입니다."));
  assert.ok(component.includes("참고 신호 보기"));
  assert.ok(component.includes("AI 생성 초안입니다. 원문·숫자·단위를 직접 대조해 주세요."));
  assert.ok(component.includes("계산·검산 루틴 완료"));
  assert.ok(component.includes("이 기기의 학습 기록에 저장됨"));
  assert.ok(component.includes("disabled={!hasAttemptForReveal}"));
  assert.ok(component.includes("markStuckAndReveal"));
  assert.ok(component.includes("hintUsedStepIds"));
  assert.equal(component.includes("activeHints[0]"), false, "reference hints must not prefill learner entries");
  assert.equal(component.includes("focus:border-[color:var(--accent)]"), false);
});

test("Problem Snap and Answer Review integrate the reusable trainer without passive duplicate panels", () => {
  const problemSnap = read("app/problem-snap/problem-snap-client.tsx");
  const answerReview = read("app/answer-review/answer-review-client.tsx");

  assert.ok(problemSnap.includes("CalculatorRoutineTrainer"));
  assert.ok(problemSnap.includes("getCalculatorRoutineEligibility"));
  assert.ok(problemSnap.includes('getProblemSnapSubjectView(subject) === "practice"'));
  assert.ok(problemSnap.includes("calculatorRoutineDraftKey"));
  assert.ok(problemSnap.includes("data-problem-snap-calculator-reference"));
  assert.ok(problemSnap.includes("참고 신호 보기"));
  assert.ok(problemSnap.indexOf("<CalculatorRoutineTrainer") < problemSnap.indexOf("renderCalculatorStepPanel(result)"));
  assert.ok(problemSnap.indexOf("renderCalculatorStepPanel(result)") < problemSnap.indexOf('<div><h3 className="font-medium">{resultHeading}'));
  assert.ok(problemSnap.includes("복습 큐에 저장"));
  assert.ok(problemSnap.includes("Answer Review로 내 풀이 검토하기"));

  assert.ok(answerReview.includes("CalculatorRoutineTrainer"));
  assert.equal((answerReview.match(/<CalculatorRoutineTrainer/g) ?? []).length, 1);
  assert.equal(answerReview.includes("CalculationCheckPanel"), false);
  assert.equal(answerReview.includes("data-answer-review-calculation-check"), false);
  assert.ok(answerReview.includes("problemSnapRoutineReference"));
  assert.ok(answerReview.includes("setRevisionParagraph(normalizedDraft.rewriteDraftSuggestion)"));
  assert.equal(answerReview.includes("/instructor"), false);
});

test("calculator routine learner surfaces avoid grading, score, pass, and endorsement claims", () => {
  const combined = [
    "lib/review-os/calculator-routine.ts",
    "components/review-os/calculator-routine-trainer.tsx",
    "app/problem-snap/problem-snap-client.tsx",
    "app/answer-review/answer-review-client.tsx",
  ].map(read).join("\n");

  [
    "공식 채점",
    "공식 답안",
    "모범답안",
    "기준답안",
    "점수예측",
    "합격예측",
    "합격 가능성 확정",
    "CASIO 공식 보증",
    "정답 확인 완료",
  ].forEach((phrase) => assert.equal(combined.includes(phrase), false, phrase));
});
