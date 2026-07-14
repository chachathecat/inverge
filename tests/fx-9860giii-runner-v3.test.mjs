import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  CALCULATOR_ROUTINE_COMPLETION_STORAGE_KEY,
  CALCULATOR_ROUTINE_SESSION_STORAGE_PREFIX,
  CALCULATOR_ROUTINE_STEPS,
  createCalculatorRoutineDraft,
  getCalculatorRoutineDraftStorageKey,
  getCalculatorRoutineEligibility,
  parseCalculatorRoutineDraftFromSession,
  serializeCalculatorRoutineDraftForSession,
  updateCalculatorRoutineDraftCurrentStep,
  updateCalculatorRoutineDraftStep,
} from "../lib/review-os/calculator-routine.ts";

const read = (path) => readFileSync(path, "utf8");

test("S229 reuses the canonical nine-step contract and persistence keys", () => {
  assert.deepEqual(
    CALCULATOR_ROUTINE_STEPS.map((step) => step.id),
    [
      "conditions",
      "formula",
      "numbers_units",
      "casio_input",
      "display_value",
      "answer_value",
      "unit_rounding",
      "verification",
      "mistake_type",
    ],
  );
  assert.equal(CALCULATOR_ROUTINE_STEPS.length, 9);
  assert.equal(CALCULATOR_ROUTINE_COMPLETION_STORAGE_KEY, "inverge.calculatorRoutine.completions.v1");

  let draft = createCalculatorRoutineDraft({
    source: "answer-review",
    examMode: "second",
    subject: "감정평가실무",
    routineId: "answer-review-s229-synthetic",
    now: "2026-07-14T00:00:00.000Z",
  });
  draft = updateCalculatorRoutineDraftStep(draft, "conditions", "합성 조건 확인", "2026-07-14T00:01:00.000Z");
  draft = updateCalculatorRoutineDraftCurrentStep(draft, "formula", "2026-07-14T00:02:00.000Z");

  const storageKey = getCalculatorRoutineDraftStorageKey(draft.routineId);
  assert.ok(storageKey.startsWith(CALCULATOR_ROUTINE_SESSION_STORAGE_PREFIX));
  const restored = parseCalculatorRoutineDraftFromSession(serializeCalculatorRoutineDraftForSession(draft));
  assert.equal(restored?.currentStepId, "formula");
  assert.equal(restored?.entries.conditions, "합성 조건 확인");
});

test("S229 runner makes one step dominant and keeps device claims honest", () => {
  const component = read("components/review-os/calculator-routine-trainer.tsx");

  assert.ok(component.includes('type RunnerViewState = "loading" | "empty" | "error" | "offline" | "active" | "completed"'));
  assert.ok(component.includes("data-calculator-routine-view-state"));
  assert.ok(component.includes("data-calculator-routine-active-step"));
  assert.ok(component.includes("grid grid-cols-9"));
  assert.ok(component.includes("CASIO fx-9860GIII"));
  assert.ok(component.includes("기기 검증 전"));
  assert.ok(component.includes("자동으로 계산하거나 권위 있는 판정·검증된 타건을 제공하지 않습니다."));
  assert.ok(component.includes("지원하지 않는 계산 유형"));
  assert.ok(component.includes("자동 계산이나 공식 타건 안내를 만들지 않습니다."));
  assert.ok(component.includes("오프라인 상태입니다."));
  assert.ok(component.includes("min-h-11"), "interactive targets must be at least 44px");
  assert.ok(component.includes("focus-visible:ring-2"), "keyboard focus must be visible");
  assert.ok(component.includes("text-xs"), "supporting copy must not drop below 12px");
  assert.equal(component.includes("공식 검증 완료"), false);
  assert.equal(component.includes("기기 검증 완료"), false);
  assert.equal(component.includes("저장 프로그램"), false);
});

test("S229 CASIO route uses the existing trainer and suppresses the competing three-step runner", () => {
  const page = read("app/app/calculator/page.tsx");
  const workflowPage = read("components/review-os/calculator-workflow-page.tsx");

  assert.ok(page.includes("CalculatorWorkflowPage"));
  assert.equal(page.includes("CalculatorRoutineTrainer"), false, "the server route must stay thin");
  assert.ok(workflowPage.includes("data-calculator-routine-v3"));
  assert.ok(workflowPage.includes('source="answer-review"'));
  assert.ok(workflowPage.includes('reason: "manual_practice"'));
  assert.ok(workflowPage.includes("activeCard && !isCasioFocus"));
  assert.ok(workflowPage.includes("!isRecoveryMode && !isCasioFocus"));
  assert.ok((workflowPage.match(/!isCasioFocus \? \(/g) ?? []).length >= 3);
});

test("unsupported contexts remain fail-closed", () => {
  assert.deepEqual(
    getCalculatorRoutineEligibility({ examMode: "first", subject: "회계학" }),
    { eligible: false, manualEligible: false, hasStrongSignal: false, reason: "unsupported_context" },
  );
  assert.deepEqual(
    getCalculatorRoutineEligibility({ examMode: "second", subject: "감정평가이론" }),
    { eligible: false, manualEligible: false, hasStrongSignal: false, reason: "unsupported_context" },
  );
});


test("S229 authenticated browser gate stays Preview-only and credential-safe", () => {
  const spec = read("tests/e2e/fx-9860giii-runner-v3.spec.ts");
  const workflow = read(".github/workflows/s229-runtime.yml");

  assert.ok(spec.includes('trace: "off"'));
  assert.ok(spec.includes('video: "off"'));
  assert.ok(spec.includes('screenshot: "off"'));
  assert.ok(spec.includes("refuses production and non-approved hosts"));
  assert.ok(spec.includes("realDeviceVerified: false"));
  assert.ok(spec.includes('deviceStatus: "기기 검증 전"'));
  assert.ok(spec.includes("consoleErrorCount"));
  assert.ok(spec.includes("sameOriginErrorCount"));
  assert.ok(workflow.includes("<!-- run-s229-auth-e2e -->"));
  assert.ok(workflow.includes("github.event.pull_request.number == 564"));
  assert.ok(workflow.includes("secrets.E2E_USER_EMAIL || secrets.TEST_USER_EMAIL"));
  assert.ok(workflow.includes("secrets.E2E_USER_PASSWORD || secrets.TEST_USER_PASSWORD"));
  assert.ok(workflow.includes("VERCEL_AUTOMATION_BYPASS_SECRET"));
  assert.ok(workflow.includes("test-results/**/s229-runtime.json"));
  assert.equal(workflow.includes("echo \"\${E2E_USER_PASSWORD}\""), false);
  assert.equal(workflow.includes("**/trace.zip"), false);
  assert.equal(workflow.includes("test-results/**/s229-*.png"), true);
  assert.equal(workflow.includes("s229-authenticated-runtime"), true);
});
