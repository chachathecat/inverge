import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildCalculatorStepPresentation,
  getCalculatorStepPresentationVariant,
} from "../lib/review-os/calculator-step-presentation.ts";
import {
  CALCULATOR_ROUTINE_COMPLETION_STORAGE_KEY,
  CALCULATOR_ROUTINE_STEPS,
  createCalculatorRoutineDraft,
  getCalculatorRoutineDraftStorageKey,
} from "../lib/review-os/calculator-routine.ts";
import {
  CALCULATOR_WORKFLOWS,
  getCalculatorWorkflowHref,
} from "../lib/review-os/calculator-workflow.ts";

const read = (path) => readFileSync(path, "utf8");

function draft(overrides = {}) {
  return {
    ...createCalculatorRoutineDraft({
      source: "answer-review",
      examMode: "second",
      subject: "감정평가실무",
      routineId: "s232c2-synthetic",
      now: "2026-07-15T00:00:00.000Z",
    }),
    ...overrides,
  };
}

test("S232C.2 maps only the three canonical runner steps to Figma variants", () => {
  const expected = new Map([
    ["casio_input", "KeyInput"],
    ["display_value", "Display"],
    ["answer_value", "Transfer"],
  ]);

  assert.deepEqual(
    CALCULATOR_ROUTINE_STEPS.map(({ id }) => [id, getCalculatorStepPresentationVariant(id)]),
    CALCULATOR_ROUTINE_STEPS.map(({ id }) => [id, expected.get(id) ?? null]),
  );
  assert.equal(CALCULATOR_ROUTINE_STEPS.length, 9);
});

test("S232C.2 stays Current for blank or stuck steps and completes only from a learner record", () => {
  const blank = buildCalculatorStepPresentation(draft(), "casio_input");
  assert.equal(blank?.state, "Current");
  assert.deepEqual(blank?.stateEvidence, { kind: "active-step", active: true });

  const stuck = buildCalculatorStepPresentation(
    draft({ stuckStepIds: ["casio_input"] }),
    "casio_input",
  );
  assert.equal(stuck?.state, "Current", "stuck is not Error or Complete evidence");

  const recorded = buildCalculatorStepPresentation(
    draft({ entries: { casio_input: "100 × 2 EXE" } }),
    "casio_input",
  );
  assert.equal(recorded?.state, "Complete");
  assert.deepEqual(recorded?.stateEvidence, { kind: "learner-record", recorded: true });
});

test("S232C.2 shows Error only for the matching explicit learner mistake", () => {
  const unrelated = buildCalculatorStepPresentation(
    draft({ mistakeTypes: ["rounding"] }),
    "display_value",
  );
  assert.equal(unrelated?.state, "Current");

  const explicit = buildCalculatorStepPresentation(
    draft({
      entries: { display_value: "200" },
      mistakeTypes: ["display_reading"],
      stuckStepIds: ["display_value"],
    }),
    "display_value",
  );
  assert.equal(explicit?.state, "Error");
  assert.deepEqual(explicit?.stateEvidence, {
    kind: "input-error",
    invalidInput: true,
    detail: "학습자가 화면값 판독 오류를 기록했습니다.",
  });
});

test("S232C.2 uses only learner records and fail-closed unverified copy", () => {
  const presentation = buildCalculatorStepPresentation(
    draft({
      entries: {
        formula: "A = B × C",
        casio_input: "100 × 2 EXE",
        display_value: "200",
        answer_value: "200원",
      },
    }),
    "answer_value",
  );

  assert.equal(presentation?.stepLabel, "6 / 9 · 답안 기재값 확인");
  assert.equal(presentation?.formula, "A = B × C");
  assert.equal(presentation?.displayValue, "200");
  assert.equal(presentation?.keySequence, "100 × 2 EXE");
  assert.equal(presentation?.verification, "기기 검증 전");
  assert.equal(presentation?.showStateLabel, false);
  assert.equal(presentation?.showVerification, true);
});

test("S232C.2 routes every workflow to its focused runner", () => {
  assert.equal(
    getCalculatorWorkflowHref(CALCULATOR_WORKFLOWS.practice),
    "/app/calculator?context=practice&mode=second&focus=casio",
  );
  assert.equal(
    getCalculatorWorkflowHref(CALCULATOR_WORKFLOWS.accounting),
    "/app/calculator?context=accounting&mode=first&focus=accounting_template",
  );

  const capture = read("components/review-os/capture-form.tsx");
  const itemDetail = read("app/app/items/[itemId]/page.tsx");
  assert.ok(capture.includes("href={getCalculatorWorkflowHref(calculatorWorkflow)}"));
  assert.equal(
    (itemDetail.match(/getCalculatorWorkflowHref\(calculatorWorkflow\)/g) ?? []).length,
    2,
  );
});

test("S232C.2 keeps the passive primitive outside the existing editable control contract", () => {
  const trainer = read("components/review-os/calculator-routine-trainer.tsx");
  assert.ok(trainer.includes("buildCalculatorStepPresentation(draft, currentStep.id)"));
  assert.ok(trainer.includes('testId="calculator-step-runner-v3"'));
  assert.ok(trainer.indexOf("<CalculatorStep") < trainer.indexOf("{currentTextStepId ? ("));
  assert.ok(trainer.includes("<Textarea"));
  assert.ok(trainer.includes("grid grid-cols-9"));
  assert.ok(trainer.includes("serializeCalculatorRoutineDraftForSession(draft)"));
  assert.ok(trainer.includes("buildCalculatorRoutineCompletionSignal(draft)"));
  assert.equal(
    CALCULATOR_ROUTINE_COMPLETION_STORAGE_KEY,
    "inverge.calculatorRoutine.completions.v1",
  );
  assert.equal(
    getCalculatorRoutineDraftStorageKey("s232c2-synthetic"),
    "inverge.calculatorRoutine.draft.v1:s232c2-synthetic",
  );
});

test("S232C.2 authenticated gate is exact-head and metadata-only", () => {
  const spec = read("tests/e2e/s232c2-calculator-step-runner.spec.ts");
  const workflow = read(".github/workflows/s232c2-runtime.yml");
  assert.ok(spec.includes('screenshot: "off"'));
  assert.ok(spec.includes('trace: "off"'));
  assert.ok(spec.includes('video: "off"'));
  assert.ok(spec.includes("rawLearnerContentCaptured: false"));
  assert.ok(spec.includes("credentialsCaptured: false"));
  assert.ok(spec.includes("keyboardOrderVerified: true"));
  assert.ok(spec.includes("passivePrimitiveTabStopCount: 0"));
  assert.ok(workflow.includes("github.event.pull_request.number == 588"));
  assert.ok(workflow.includes("github.event.pull_request.head.sha"));
  assert.ok(workflow.includes("deployments?sha=${E2E_RUNNER_SHA}"));
  assert.ok(workflow.includes("secrets.E2E_USER_EMAIL || secrets.TEST_USER_EMAIL"));
  assert.ok(workflow.includes("secrets.E2E_USER_PASSWORD || secrets.TEST_USER_PASSWORD"));
  assert.ok(workflow.includes("VERCEL_AUTOMATION_BYPASS_SECRET"));
  assert.ok(workflow.includes("test-results/**/s232c2-runtime.json"));
  assert.equal(workflow.includes("gh api -X GET +"), false);
  assert.equal(workflow.includes("curl --silent --show-error +"), false);
  assert.equal(workflow.includes('] && +'), false);
  assert.equal(workflow.includes("**/trace.zip"), false);
  assert.equal(workflow.includes("**/*.png"), false);
});
