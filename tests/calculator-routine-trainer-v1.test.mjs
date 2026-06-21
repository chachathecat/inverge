import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  appendCalculatorRoutineCompletionSignal,
  analyzeCalculatorEvidence,
  buildCalculatorRoutineCompletionSignal,
  CALCULATOR_ROUTINE_COMPLETION_STORAGE_KEY,
  CALCULATOR_ROUTINE_MISTAKE_OPTIONS,
  CALCULATOR_ROUTINE_SESSION_STORAGE_PREFIX,
  CALCULATOR_ROUTINE_STEPS,
  CALCULATOR_ROUTINE_VERIFICATION_OPTIONS,
  createCalculatorRoutineDraft,
  getCalculatorRoutineDraftStorageKey,
  getCalculatorRoutineEligibility,
  getDisplayCalculatorKeystrokes,
  getMeaningfulCalculatorKeystrokeSteps,
  getCalculatorRoutineProgress,
  hasMeaningfulCalculatorKeystrokeSignal,
  hasStrongCalculatorGuideSignal,
  hasStrongCalculatorRoutineSignal,
  isCalculatorRoutineStepComplete,
  isGenericCalculatorFallbackStepSequence,
  isMeaningfulCalculatorSignal,
  isNegativeCalculatorSignal,
  normalizeCalculatorRoutineMistakeTypes,
  parseCalculatorRoutineCompletionHistory,
  parseCalculatorRoutineDraftFromSession,
  serializeCalculatorRoutineCompletionHistoryForLocalStorage,
  serializeCalculatorRoutineDraftForSession,
  shouldUnlockProblemSnapCalculatorReference,
  updateCalculatorRoutineDraftCurrentStep,
  updateCalculatorRoutineDraftStep,
} from "../lib/review-os/calculator-routine.ts";
import { buildCasioFx9860GiiiGuide } from "../lib/evaluate/casio-fx9860giii-guide.ts";

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

  const allStuck = {
    ...createCalculatorRoutineDraft({
      source: "problem-snap",
      examMode: "second",
      subject: "감정평가실무",
      routineId: "routine-all-stuck",
      now: "2026-06-20T00:00:00.000Z",
    }),
    stuckStepIds: CALCULATOR_ROUTINE_STEPS.map((step) => step.id),
  };
  assert.equal(getCalculatorRoutineProgress(allStuck).isComplete, false);
  assert.throws(() => buildCalculatorRoutineCompletionSignal(allStuck), /calculator-routine-incomplete/);

  const stuckVerification = {
    ...completeDraft(),
    verificationMethods: [],
    stuckStepIds: ["verification"],
  };
  assert.equal(isCalculatorRoutineStepComplete(stuckVerification, "verification"), false);
  assert.throws(() => buildCalculatorRoutineCompletionSignal(stuckVerification), /calculator-routine-incomplete|missing-verification/);

  const stuckMistake = {
    ...completeDraft(),
    mistakeTypes: [],
    stuckStepIds: ["mistake_type"],
  };
  assert.equal(isCalculatorRoutineStepComplete(stuckMistake, "mistake_type"), false);
  assert.throws(() => buildCalculatorRoutineCompletionSignal(stuckMistake), /calculator-routine-incomplete|missing-mistake/);

  const stuckText = {
    ...completeDraft(),
    entries: { ...completeDraft().entries, casio_input: "" },
    stuckStepIds: ["casio_input"],
  };
  assert.equal(isCalculatorRoutineStepComplete(stuckText, "casio_input"), true);
  assert.equal(getCalculatorRoutineProgress(stuckText).isComplete, true);

  const typedAfterStuck = updateCalculatorRoutineDraftStep(stuckText, "casio_input", "MENU 1 EXE");
  assert.equal(typedAfterStuck.stuckStepIds.includes("casio_input"), false);
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
  assert.deepEqual(signal.stuckStepIds, []);

  const stuckTextSignal = buildCalculatorRoutineCompletionSignal(
    {
      ...completeDraft(),
      entries: { ...completeDraft().entries, casio_input: "" },
      stuckStepIds: ["casio_input"],
    },
    "2026-06-20T00:31:00.000Z",
  );
  assert.deepEqual(stuckTextSignal.stuckStepIds, ["casio_input"]);
  assert.ok(stuckTextSignal.completedStepIds.includes("casio_input"));

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
    "막힘",
    "RAW_STUCK_SENTINEL",
  ].forEach((token) => assert.equal(serialized.includes(token), false, `raw token leaked: ${token}`));
  assert.equal(JSON.stringify(stuckTextSignal).includes("RAW_CASIO_SENTINEL"), false);
});

test("stuck verification and mistake steps do not synthesize fallback selections", () => {
  const combined = [
    "lib/review-os/calculator-routine.ts",
    "components/review-os/calculator-routine-trainer.tsx",
  ].map(read).join("\n");

  assert.equal(/verificationMethods:\s*\[\s*"other"\s*\]/.test(combined), false);
  assert.equal(/mistakeTypes:\s*\[\s*"other"\s*\]/.test(combined), false);
  assert.equal(/stuckStepIds\.includes\("verification"\)[\s\S]{0,120}\["other"\]/.test(combined), false);
  assert.equal(/stuckStepIds\.includes\("mistake_type"\)[\s\S]{0,120}\["other"\]/.test(combined), false);
});

test("draft and completion storage helpers keep raw and metadata scopes separate", () => {
  const draft = completeDraft();
  const rawSessionDraft = serializeCalculatorRoutineDraftForSession(draft);
  assert.ok(getCalculatorRoutineDraftStorageKey(draft.routineId).startsWith(CALCULATOR_ROUTINE_SESSION_STORAGE_PREFIX));
  assert.ok(rawSessionDraft.includes("RAW_CASIO_SENTINEL"), "raw draft is session-scoped only");
  assert.equal(parseCalculatorRoutineDraftFromSession("{bad json"), null);
  assert.equal(parseCalculatorRoutineDraftFromSession(rawSessionDraft)?.entries.casio_input, textStepEntries.casio_input);

  const signal = buildCalculatorRoutineCompletionSignal(draft, "2026-06-20T00:30:00.000Z");
  const stuckSignal = buildCalculatorRoutineCompletionSignal(
    {
      ...draft,
      entries: { ...draft.entries, formula: "" },
      stuckStepIds: ["formula"],
    },
    "2026-06-20T00:31:00.000Z",
  );
  const oversized = Array.from({ length: 55 }, (_, index) => ({ ...signal, routineId: `routine-${index}` }));
  const capped = appendCalculatorRoutineCompletionSignal(oversized, stuckSignal);
  assert.equal(capped.length, 50);
  assert.deepEqual(capped[0].stuckStepIds, ["formula"]);
  assert.equal(CALCULATOR_ROUTINE_COMPLETION_STORAGE_KEY, "inverge.calculatorRoutine.completions.v1");
  assert.deepEqual(parseCalculatorRoutineCompletionHistory("{bad json"), []);
  const serializedHistory = serializeCalculatorRoutineCompletionHistoryForLocalStorage(capped);
  assert.ok(serializedHistory.includes("stuckStepIds"));
  assert.equal(serializedHistory.includes("RAW_CASIO_SENTINEL"), false);
  assert.equal(serializedHistory.includes("RAW_FORMULA_SENTINEL"), false);
});

test("eligibility is limited to second exam practice and ignores placeholder calculator fallbacks", () => {
  assert.equal(getCalculatorRoutineEligibility({ examMode: "first", subject: "감정평가실무" }).eligible, false);
  assert.equal(getCalculatorRoutineEligibility({ examMode: "second", subject: "감정평가이론" }).manualEligible, false);
  assert.equal(
    hasStrongCalculatorGuideSignal({
      calculationPurpose: "검토 필요",
      recommendedMode: "검토 필요",
      keystrokeSteps: ["계산기 입력 없음"],
      expectedDisplay: "확인 필요",
      answerRounding: "해당 없음",
      caution: "AI 생성 초안입니다. 원문·숫자·단위를 직접 대조해 주세요.",
    }),
    false,
    "generic caution alone must not surface calculator UI",
  );
  const productionFallbackGuide = buildCasioFx9860GiiiGuide({
    calculationPurpose: "계산기 입력이 필요한 문제인지 검토가 필요합니다.",
    recommendedMode: "검토 필요",
    keystrokeSteps: ["계산기 입력 없음"],
  });
  assert.equal(
    hasStrongCalculatorGuideSignal(productionFallbackGuide),
    false,
    "production CASIO fallback purpose must not count as a calculator signal",
  );
  assert.equal(
    hasStrongCalculatorRoutineSignal({
      formulas: [],
      extractedNumbersAndUnits: [],
      stepByStepSolution: [],
      calculatorGuide: productionFallbackGuide,
    }),
    false,
    "production CASIO fallback guide must not surface calculator UI by itself",
  );
  assert.equal(
    hasStrongCalculatorGuideSignal(buildCasioFx9860GiiiGuide({
      calculationPurpose: "계산기 입력이 필요한 문제인지 검토가 필요합니다.",
      recommendedMode: "RUN-MAT",
      keystrokeSteps: [],
    })),
    false,
    "placeholder purpose plus RUN-MAT plus generic builder steps must stay weak",
  );
  assert.equal(
    hasStrongCalculatorGuideSignal({
      calculationPurpose: "계산기 입력이 필요한 문제인지 검토가 필요합니다.",
      recommendedMode: "RUN-MAT",
      keystrokeSteps: [],
    }),
    false,
    "RUN-MAT with empty steps must not create calculation evidence",
  );
  assert.equal(
    hasStrongCalculatorGuideSignal({
      calculationPurpose: "계산기 입력이 필요한 문제인지 검토가 필요합니다.",
      recommendedMode: "RUN-MAT",
    }),
    false,
    "RUN-MAT alone with placeholder purpose must not create calculation evidence",
  );
  assert.equal(
    hasStrongCalculatorGuideSignal({ recommendedMode: "RUN-MAT" }),
    false,
    "RUN-MAT alone must not create calculation evidence",
  );
  const builderDefaultFallbackGuide = buildCasioFx9860GiiiGuide({
    calculationPurpose: "계산기 입력이 필요한 문제인지 검토가 필요합니다.",
    recommendedMode: "검토 필요",
    keystrokeSteps: [],
  });
  assert.deepEqual(builderDefaultFallbackGuide.keystrokeSteps, ["MENU", "RUN-MAT", "계산식 입력", "EXE"]);
  assert.equal(isGenericCalculatorFallbackStepSequence(builderDefaultFallbackGuide.keystrokeSteps), true);
  assert.deepEqual(getMeaningfulCalculatorKeystrokeSteps(builderDefaultFallbackGuide.keystrokeSteps), []);
  assert.equal(hasMeaningfulCalculatorKeystrokeSignal(builderDefaultFallbackGuide.keystrokeSteps), false);
  assert.deepEqual(getMeaningfulCalculatorKeystrokeSteps(["MENU", "RUN-MAT", "계산식 입력", "EXE"]), []);
  assert.equal(hasMeaningfulCalculatorKeystrokeSignal(["RUN-MAT"]), false);
  assert.equal(hasStrongCalculatorGuideSignal(builderDefaultFallbackGuide), false);
  assert.equal(
    hasStrongCalculatorRoutineSignal({ calculatorGuide: builderDefaultFallbackGuide }),
    false,
    "builder-injected default steps must not become a strong signal by themselves",
  );
  assert.equal(
    hasStrongCalculatorGuideSignal({
      calculationPurpose: "계산기 입력이 필요한 문제인지 검토가 필요합니다.",
      recommendedMode: "검토 필요",
    }),
    false,
    "omitted keystrokes with placeholder purpose and review mode must stay weak",
  );
  [
    "계산기는 불필요합니다",
    "계산기가 불필요합니다",
    "계산기 사용이 불필요합니다",
    "계산기 사용은 불필요합니다",
    "계산기 입력이 필요하지 않습니다",
    "계산기가 필요하지 않습니다",
    "계산기 사용 불필요",
    "계산기 미사용",
    "계산기 필요 없음",
    "CASIO 입력이 필요하지 않습니다",
    "CASIO 사용이 불필요합니다",
    "CASIO는 불필요합니다",
    "CASIO 미사용",
    "CASIO 필요 없음",
  ].forEach((calculationPurpose) => {
    assert.equal(isNegativeCalculatorSignal(calculationPurpose), true, `${calculationPurpose} should be negative`);
    assert.equal(isMeaningfulCalculatorSignal(calculationPurpose), false, `${calculationPurpose} should not be meaningful`);
    assert.equal(
      hasStrongCalculatorGuideSignal({ calculationPurpose, recommendedMode: "검토 필요" }),
      false,
      `${calculationPurpose} must not count as a calculator signal`,
    );
  });
  [
    "계산기 사용이 필요합니다",
    "CASIO 입력이 필요합니다",
    "RUN-MAT에서 계산합니다",
    "CASIO로 직접환원가치를 계산합니다",
  ].forEach((calculationPurpose) => {
    assert.equal(isNegativeCalculatorSignal(calculationPurpose), false, `${calculationPurpose} should not be negative`);
  });
  assert.equal(
    hasStrongCalculatorRoutineSignal({
      formulas: [],
      extractedNumbersAndUnits: ["공익사업법 제20조", "30일"],
      stepByStepSolution: ["사업인정 절차를 순서대로 정리"],
      calculatorGuide: {
        calculationPurpose: "검토 필요",
        recommendedMode: "검토 필요",
        keystrokeSteps: [],
        expectedDisplay: "확인 필요",
        answerRounding: "해당 없음",
      },
    }),
    false,
    "law/theory explanation steps and article numbers are not calculator signals",
  );
  assert.equal(
    hasStrongCalculatorRoutineSignal({
      formulas: [],
      extractedNumbersAndUnits: ["직접환원 수익 12,000,000원/㎡"],
      stepByStepSolution: ["환원율로 계산 후 단위 반올림"],
    }),
    true,
  );
  assert.equal(
    hasStrongCalculatorGuideSignal(buildCasioFx9860GiiiGuide({
      calculationPurpose: "직접환원가치 계산",
      recommendedMode: "검토 필요",
      keystrokeSteps: [],
    })),
    false,
    "display-only purpose must not count when builder defaults are present",
  );
  assert.equal(hasStrongCalculatorGuideSignal({ recommendedMode: "RUN-MAT", keystrokeSteps: ["100 × 0.05 EXE"] }), true);
  assert.deepEqual(getMeaningfulCalculatorKeystrokeSteps(["100 × 0.05 EXE"]), ["100 × 0.05 EXE"]);
  assert.equal(hasMeaningfulCalculatorKeystrokeSignal(["100 × 0.05 EXE"]), true);
  assert.equal(hasStrongCalculatorGuideSignal({ recommendedMode: "검토 필요", expectedDisplay: "240000000" }), true);
  assert.equal(hasStrongCalculatorGuideSignal({ recommendedMode: "검토 필요", answerRounding: "240,000,000원" }), true);

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

test("calculator evidence analyzer rejects production fallbacks and generic modes", () => {
  const productionFallbackGuide = buildCasioFx9860GiiiGuide({
    calculationPurpose: "계산기 입력이 필요한 문제인지 검토가 필요합니다.",
    recommendedMode: "검토 필요",
    keystrokeSteps: ["계산기 입력 없음"],
    expectedDisplay: undefined,
    answerRounding: undefined,
  });

  assert.equal(hasStrongCalculatorGuideSignal(productionFallbackGuide), false);
  assert.equal(
    hasStrongCalculatorRoutineSignal({
      formulas: [],
      extractedNumbersAndUnits: [],
      stepByStepSolution: [],
      calculatorGuide: productionFallbackGuide,
    }),
    false,
  );

  const productionFallbackAnalysis = analyzeCalculatorEvidence({ calculatorGuide: productionFallbackGuide });
  assert.equal(productionFallbackAnalysis.hasStrongSignal, false);
  assert.deepEqual(productionFallbackAnalysis.evidenceSources, []);
  assert.deepEqual(productionFallbackAnalysis.display.keystrokeSteps, []);
  assert.equal(productionFallbackAnalysis.display.recommendedMode, null);
  assert.equal(productionFallbackAnalysis.diagnostics.keystrokesAreGenericFallback, false);

  [
    {
      name: "placeholder purpose plus RUN-MAT plus generic builder steps",
      guide: buildCasioFx9860GiiiGuide({
        calculationPurpose: "계산기 입력이 필요한 문제인지 검토가 필요합니다.",
        recommendedMode: "RUN-MAT",
        keystrokeSteps: [],
      }),
      expected: false,
    },
    {
      name: "placeholder purpose plus RUN-MAT plus empty steps",
      guide: {
        calculationPurpose: "계산기 입력이 필요한 문제인지 검토가 필요합니다.",
        recommendedMode: "RUN-MAT",
        keystrokeSteps: [],
      },
      expected: false,
    },
    {
      name: "RUN-MAT alone",
      guide: { recommendedMode: "RUN-MAT" },
      expected: false,
    },
    {
      name: "RUN-MAT with custom keystrokes",
      guide: { recommendedMode: "RUN-MAT", keystrokeSteps: ["100 × 0.05 EXE"] },
      expected: true,
      sources: ["custom_keystroke"],
    },
    {
      name: "meaningful purpose plus generic steps only",
      guide: buildCasioFx9860GiiiGuide({
        calculationPurpose: "직접환원가치 계산",
        recommendedMode: "RUN-MAT",
        keystrokeSteps: [],
      }),
      expected: false,
    },
    {
      name: "meaningful expected display",
      guide: { recommendedMode: "검토 필요", expectedDisplay: "240000000" },
      expected: true,
      sources: ["expected_display"],
    },
    {
      name: "meaningful answer rounding",
      guide: { recommendedMode: "검토 필요", answerRounding: "240,000,000원" },
      expected: true,
      sources: ["answer_rounding"],
    },
  ].forEach(({ name, guide, expected, sources }) => {
    const analysis = analyzeCalculatorEvidence({ calculatorGuide: guide });
    assert.equal(analysis.hasStrongSignal, expected, name);
    if (sources) assert.deepEqual(analysis.evidenceSources, sources, name);
    assert.equal(hasStrongCalculatorGuideSignal(guide), expected, name);
  });

  [
    {
      name: "formula",
      input: { formulas: ["순영업소득 ÷ 환원율 = 직접환원가치"] },
      sources: ["formula"],
    },
    {
      name: "number and unit",
      input: { extractedNumbersAndUnits: ["순영업소득 120,000,000원"] },
      sources: ["number_unit"],
    },
    {
      name: "calculation step",
      input: { stepByStepSolution: ["순영업소득을 환원율로 나눈다"] },
      sources: ["calculation_step"],
    },
    {
      name: "calculation context",
      input: { calculationContextText: "CASIO로 숫자를 계산합니다" },
      sources: ["calculation_step"],
    },
  ].forEach(({ name, input, sources }) => {
    const analysis = analyzeCalculatorEvidence(input);
    assert.equal(analysis.hasStrongSignal, true, name);
    assert.deepEqual(analysis.evidenceSources, sources, name);
  });

  [
    { formulas: ["수익방식의 이론적 근거"] },
    { extractedNumbersAndUnits: ["공익사업법 제0조", "30일"] },
    { stepByStepSolution: ["사업인정 절차를 순서대로 정리"] },
    { calculationContextText: "보상 절차와 공시지가 개념" },
  ].forEach((input) => {
    assert.equal(analyzeCalculatorEvidence(input).hasStrongSignal, false, JSON.stringify(input));
  });
});

test("calculator negative grammar normalizes calculator and CASIO aliases", () => {
  const deviceAliases = ["계산기", "CASIO", "Casio", "casio", "카시오"];
  const negativeForms = [
    "불필요합니다",
    "사용이 불필요합니다",
    "사용은 불필요합니다",
    "입력이 필요하지 않습니다",
    "필요하지 않습니다",
    "사용 불필요",
    "미사용",
    "필요 없음",
    "사용하지 않습니다",
    "사용 안 함",
    "안 씁니다",
    "쓰지 않습니다",
    "입력하지 않습니다",
    "입력 안 함",
    "없이 풉니다",
  ];

  deviceAliases.flatMap((device) => negativeForms.map((form) => `${device} ${form}`)).forEach((value) => {
    assert.equal(isNegativeCalculatorSignal(value), true, value);
    assert.equal(isMeaningfulCalculatorSignal(value), false, value);
    assert.equal(hasStrongCalculatorGuideSignal({ calculationPurpose: value, recommendedMode: "RUN-MAT" }), false, value);
  });

  [
    "계산기 사용이 필요합니다",
    "계산기 입력이 필요합니다",
    "CASIO 입력이 필요합니다",
    "RUN-MAT에서 계산합니다",
    "CASIO로 직접환원가치를 계산합니다",
    "카시오로 환원가치를 계산합니다",
  ].forEach((value) => {
    assert.equal(isNegativeCalculatorSignal(value), false, value);
    assert.equal(isMeaningfulCalculatorSignal(value), true, value);
  });
});

test("calculator bare no-use values stay weak without device context", () => {
  const bareNegativeValues = [
    "사용 안 함",
    "사용안함",
    "사용하지 않음",
    "사용하지 않습니다",
    "미사용",
    "필요 없음",
    "필요없음",
    "필요하지 않음",
    "필요하지 않습니다",
    "불필요",
    "입력 안 함",
    "입력안함",
    "입력하지 않음",
    "입력하지 않습니다",
    "타건 안 함",
    "타건안함",
    "타건하지 않음",
    "타건하지 않습니다",
    "쓰지 않음",
    "쓰지 않습니다",
    "안 씀",
    "안씁니다",
    "안 씁니다",
    "없이 풉니다",
  ];

  bareNegativeValues.forEach((value) => {
    assert.equal(isNegativeCalculatorSignal(value), true, value);
    assert.equal(isMeaningfulCalculatorSignal(value), false, value);
  });

  [
    { calculatorGuide: { expectedDisplay: "사용 안 함" } },
    { calculatorGuide: { answerRounding: "미사용" } },
    { calculatorGuide: { keystrokeSteps: ["사용 안 함"] } },
    { calculatorGuide: { keystrokeSteps: ["미사용"] } },
    { calculatorGuide: { calculationPurpose: "필요 없음" } },
  ].forEach((input) => {
    const analysis = analyzeCalculatorEvidence(input);
    assert.equal(analysis.hasStrongSignal, false, JSON.stringify(input));
    assert.deepEqual(analysis.evidenceSources, [], JSON.stringify(input));
  });

  [
    "사용이 필요합니다",
    "입력이 필요합니다",
    "RUN-MAT에서 계산합니다",
    "직접환원가치를 계산합니다",
    "100 × 0.05 EXE",
    "240,000,000원",
  ].forEach((value) => {
    assert.equal(isNegativeCalculatorSignal(value), false, value);
    assert.equal(isMeaningfulCalculatorSignal(value), true, value);
  });

  assert.equal(analyzeCalculatorEvidence({ calculatorGuide: { expectedDisplay: "240,000,000원" } }).hasStrongSignal, true);
  assert.equal(analyzeCalculatorEvidence({ calculatorGuide: { answerRounding: "천원 단위 반올림" } }).hasStrongSignal, true);
  assert.equal(analyzeCalculatorEvidence({ calculatorGuide: { keystrokeSteps: ["100 × 0.05 EXE"] } }).hasStrongSignal, true);
});

test("calculator reference display strips generic fallback keystrokes", () => {
  assert.deepEqual(getDisplayCalculatorKeystrokes(["MENU", "RUN-MAT", "계산식 입력", "EXE"]), []);
  assert.deepEqual(getDisplayCalculatorKeystrokes([" menu ", " run-mat ", "계산식   입력", " exe "]), []);
  assert.deepEqual(getDisplayCalculatorKeystrokes(["MENU", "100 × 0.05 EXE", "EXE"]), ["100 × 0.05 EXE"]);
  assert.deepEqual(getMeaningfulCalculatorKeystrokeSteps(["MENU", "100 × 0.05 EXE", "EXE"]), ["100 × 0.05 EXE"]);

  const fallbackGuide = buildCasioFx9860GiiiGuide({
    calculationPurpose: "계산기 입력이 필요한 문제인지 검토가 필요합니다.",
    recommendedMode: "검토 필요",
    keystrokeSteps: [],
  });
  const fallbackAnalysis = analyzeCalculatorEvidence({ calculatorGuide: fallbackGuide });
  assert.deepEqual(fallbackGuide.keystrokeSteps, ["MENU", "RUN-MAT", "계산식 입력", "EXE"]);
  assert.deepEqual(fallbackAnalysis.display.keystrokeSteps, []);
  assert.equal(fallbackAnalysis.hasStrongSignal, false);
  assert.equal(fallbackAnalysis.display.recommendedMode, null);

  const source = read("app/problem-snap/problem-snap-client.tsx");
  const answerReview = read("app/answer-review/answer-review-client.tsx");
  const trainer = read("components/review-os/calculator-routine-trainer.tsx");
  assert.ok(source.includes("analysis.display.keystrokeSteps"));
  assert.equal(source.includes("guide.keystrokeSteps.filter"), false);
  assert.equal(source.includes("currentResult.calculatorGuide.keystrokeSteps"), false);
  assert.equal(answerReview.includes("RUN-MAT 기준"), false);
  assert.equal(trainer.includes("RUN-MAT을 기본"), false);
});

test("Problem Snap calculator reference unlocks only after routine access or retry memo", () => {
  assert.equal(
    shouldUnlockProblemSnapCalculatorReference({
      routineAvailable: true,
      routineReferenceUnlocked: false,
      retryMemo: "풀이 메모",
    }),
    false,
    "practice routine reference should stay locked before routine attempt",
  );
  assert.equal(
    shouldUnlockProblemSnapCalculatorReference({
      routineAvailable: true,
      routineReferenceUnlocked: true,
      retryMemo: "",
    }),
    true,
    "practice routine attempt or 막힘 should unlock through routine access",
  );
  assert.equal(
    shouldUnlockProblemSnapCalculatorReference({
      routineAvailable: false,
      routineReferenceUnlocked: false,
      retryMemo: "",
    }),
    false,
    "non-practice genuine signal should stay locked before retry memo",
  );
  assert.equal(
    shouldUnlockProblemSnapCalculatorReference({
      routineAvailable: false,
      routineReferenceUnlocked: false,
      retryMemo: "내 풀이를 먼저 한 줄로 적음",
    }),
    true,
    "non-practice reference should unlock after a retry memo",
  );
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
  assert.ok(component.includes("루틴 완료, 기기 학습 기록 저장 실패"));
  assert.ok(component.includes("제공할 참고 신호가 없습니다. 원문 조건과 숫자·단위를 직접 대조해 주세요."));
  assert.ok(component.includes("참고 신호를 확인한 뒤 실제로 수행한 검산 방법을 하나 이상 선택해 주세요."));
  assert.ok(component.includes("확인된 실수 유형을 고르거나, 실수가 없었다면 ‘실수 없음’을 선택해 주세요."));
  assert.ok(component.includes("disabled={!hasAttemptForReveal}"));
  assert.ok(component.includes("markStuckAndReveal"));
  assert.ok(component.includes("!currentStepComplete ? ("));
  assert.ok(component.includes("visibleHints = hasActiveHints ? activeHints : [noReferenceHintFallback]"));
  assert.ok(component.includes("hintUsedStepIds"));
  assert.ok(component.includes('current.stuckStepIds.filter((item) => item !== "verification")'));
  assert.ok(component.includes('current.stuckStepIds.filter((item) => item !== "mistake_type")'));
  assert.equal(component.includes("activeHints[0]"), false, "reference hints must not prefill learner entries");
  assert.equal(/verificationMethods:\s*\[\s*"other"\s*\]/.test(component), false);
  assert.equal(/mistakeTypes:\s*\[\s*"other"\s*\]/.test(component), false);
  assert.equal(component.includes("focus:border-[color:var(--accent)]"), false);
});

test("trainer completion is not blocked by localStorage persistence failure", () => {
  const component = read("components/review-os/calculator-routine-trainer.tsx");
  const buildSignalIndex = component.indexOf("signal = buildCalculatorRoutineCompletionSignal(draft);");
  const completedIndex = component.indexOf('setTrainerState("completed");');
  const onCompleteIndex = component.indexOf("onComplete?.(signal);");
  const storageWriteIndex = component.indexOf("window.localStorage.setItem(");
  const storageFailureIndex = component.indexOf("루틴 완료, 기기 학습 기록 저장 실패");

  assert.ok(buildSignalIndex >= 0, "completion signal should be built before persistence");
  assert.ok(completedIndex > buildSignalIndex, "completed state should follow successful validation");
  assert.ok(onCompleteIndex > completedIndex, "completion callback should run after completed state transition");
  assert.ok(storageWriteIndex > onCompleteIndex, "localStorage write must not gate completion callback");
  assert.ok(storageFailureIndex > storageWriteIndex, "storage failure should be handled after the write attempt");
  assert.ok(component.includes('setLiveMessage("루틴 완료 조건을 먼저 확인해 주세요.");'));
  assert.equal(component.includes("completionSignal.routineConceptCandidate.nextTaskType"), false);
  assert.ok(component.includes("복습 신호로 사용할 수 있습니다."));
});

test("Problem Snap and Answer Review integrate the reusable trainer without passive duplicate panels", () => {
  const problemSnap = read("app/problem-snap/problem-snap-client.tsx");
  const answerReview = read("app/answer-review/answer-review-client.tsx");

  assert.ok(problemSnap.includes("CalculatorRoutineTrainer"));
  assert.ok(problemSnap.includes("getCalculatorRoutineEligibility"));
  assert.ok(problemSnap.includes("analyzeCalculatorEvidence"));
  assert.ok(problemSnap.includes("getProblemSnapCalculatorEvidenceAnalysis(result)"));
  assert.ok(problemSnap.includes("return calculatorEvidenceAnalysis.hasStrongSignal;"));
  assert.equal(problemSnap.includes('subject === "감정평가실무" || calculatorEvidenceAnalysis.hasStrongSignal'), false);
  assert.ok(problemSnap.includes("const problemSnapCalculatorRoutineEligible = Boolean("));
  assert.ok(problemSnap.includes("calculatorRoutineEligibility?.eligible || calculatorRoutineEligibility?.manualEligible"));
  assert.ok(problemSnap.includes("shouldUnlockProblemSnapCalculatorReference"));
  assert.ok(problemSnap.includes("casio_input: analysis.display.keystrokeSteps,"));
  assert.ok(problemSnap.includes("const keystrokeSteps = analysis.display.keystrokeSteps;"));
  assert.ok(problemSnap.includes('renderListOrFallback(analysis.display.keystrokeSteps, "입력 순서 확인 필요")'));
  assert.equal(problemSnap.includes("const keystrokeSteps = guide.keystrokeSteps.filter(isMeaningfulCalculatorSignal);"), false);
  assert.equal(problemSnap.includes("renderListOrFallback(currentResult.calculatorGuide.keystrokeSteps"), false);
  assert.equal(problemSnap.includes("currentResult.calculatorGuide.keystrokeSteps"), false);
  assert.equal(problemSnap.includes("hasCalculatorGuideData"), false);
  const strongSignalHelper = problemSnap.slice(
    problemSnap.indexOf("const getProblemSnapCalculatorEvidenceAnalysis"),
    problemSnap.indexOf("const createCalculatorRoutineRunId"),
  );
  assert.equal(strongSignalHelper.includes("guide.caution"), false);
  assert.ok(problemSnap.includes('problemSnapSubjectView === "practice"'));
  assert.ok(problemSnap.includes("problemSnapCalculatorRoutineAvailable"));
  assert.ok(problemSnap.includes("calculatorRoutineDraftKey"));
  assert.ok(problemSnap.includes("calculatorRoutineRunId"));
  assert.ok(problemSnap.includes('key={calculatorRoutineRunId ?? "problem-snap-calculator-routine"}'));
  assert.ok(problemSnap.includes("setCalculatorRoutineDraftReference(null);"));
  assert.ok(problemSnap.includes("setCalculatorRoutineReferenceUnlocked(false);"));
  assert.ok(problemSnap.includes('setCalculatorRoutineRunId(createCalculatorRoutineRunId("problem-snap"));'));
  assert.ok(problemSnap.includes("problemSnapCalculatorReferenceUnlocked"));
  assert.ok(problemSnap.includes("routineReferenceUnlocked: calculatorRoutineReferenceUnlocked"));
  assert.ok(problemSnap.includes("retryMemo,"));
  assert.ok(problemSnap.includes("data-problem-snap-calculator-reference"));
  assert.ok(problemSnap.includes("data-problem-snap-calculator-reference-locked"));
  assert.ok(problemSnap.includes("onReferenceAccessChange={updateCalculatorReferenceAccess}"));
  assert.ok(problemSnap.includes("참고 신호 보기"));
  assert.ok(problemSnap.includes("먼저 해설 가리고 다시 풀기에서 내 풀이 메모를 남긴 뒤 전체 참고 신호를 열 수 있습니다."));
  assert.ok(problemSnap.indexOf("<CalculatorRoutineTrainer") < problemSnap.indexOf("renderCalculatorStepPanel(calculatorEvidenceAnalysis,"));
  assert.ok(problemSnap.indexOf("renderCalculatorStepPanel(calculatorEvidenceAnalysis,") < problemSnap.indexOf('<div><h3 className="font-medium">{resultHeading}'));
  assert.ok(problemSnap.includes("복습 큐에 저장"));
  assert.ok(problemSnap.includes("Answer Review로 내 풀이 검토하기"));

  assert.ok(answerReview.includes("CalculatorRoutineTrainer"));
  assert.equal((answerReview.match(/<CalculatorRoutineTrainer/g) ?? []).length, 1);
  assert.equal(answerReview.includes("CalculationCheckPanel"), false);
  assert.equal(answerReview.includes("data-answer-review-calculation-check"), false);
  assert.ok(answerReview.includes("problemSnapRoutineReference"));
  assert.ok(answerReview.includes("hasProblemSnapRoutineHandoff"));
  assert.ok(answerReview.includes('answerReviewRoutineRunId || "answer-review-calculator-routine"'));
  assert.ok(answerReview.includes("getCalculatorRoutineIdFromDraftStorageKey"));
  assert.ok(answerReview.includes('setAnswerReviewRoutineRunId(createCalculatorRoutineRunId("answer-review"));'));
  assert.ok(answerReview.includes("resumeDraftKey={hasProblemSnapRoutineHandoff ? problemSnapRoutineReference?.draftKey || undefined : undefined}"));
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
