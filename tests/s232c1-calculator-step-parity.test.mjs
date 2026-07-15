import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("S232C.1 exposes the exact CalculatorStep 3 by 3 contract", () => {
  const component = read("components/review-os/calculator-step.tsx");

  assert.match(component, /CALCULATOR_STEP_VARIANTS = \["KeyInput", "Display", "Transfer"\]/);
  assert.match(component, /CALCULATOR_STEP_STATES = \["Current", "Error", "Complete"\]/);
  assert.match(component, /state: "Current";[\s\S]*?kind: "active-step"; active: true/);
  assert.match(component, /state: "Error";[\s\S]*?kind: "input-error";[\s\S]*?invalidInput: true/);
  assert.match(component, /state: "Complete";[\s\S]*?kind: "learner-record"; recorded: true/);

  for (const phrase of [
    "현재 단계",
    "입력 오류",
    "확인 완료",
    "기기 검증 전",
    "data-device-verified=\"false\"",
    "CalculatorStep Complete requires an explicit learner record.",
  ]) {
    assert.ok(component.includes(phrase), `missing truth boundary: ${phrase}`);
  }
  assert.equal(component.includes("기기 검증 완료"), false);
  assert.equal(component.includes("정답입니다"), false);
});

test("S232C.1 matches the Figma geometry, typography, and optional properties", () => {
  const component = read("components/review-os/calculator-step.tsx");

  for (const contract of [
    "max-w-[552px]",
    "min-h-[380px]",
    "sm:min-h-[350px]",
    "gap-3",
    "rounded-[var(--v3-radius-panel)]",
    "p-6",
    "min-h-[124px]",
    "min-h-[66px]",
    "min-h-[46px]",
    "v3-type-label-strong",
    "v3-type-label",
    "v3-type-caption",
    "v3-type-compact",
    "v3-mono-small",
    "v3-mono-display",
    "data-hint-visible",
    "data-state-label-visible",
    "data-verification-visible",
  ]) {
    assert.ok(component.includes(contract), `missing Figma contract: ${contract}`);
  }

  assert.match(component, /showHint \? \([\s\S]*?data-calculator-step-hint/);
  assert.match(component, /showStateLabel \? \([\s\S]*?data-calculator-step-state-label/);
  assert.match(component, /showVerification \? \([\s\S]*?data-calculator-step-verification/);
  assert.equal(/<(button|input|textarea|select)\b/.test(component), false);
});

test("S232C.1 Preview renders every combination and the real mobile boolean override", () => {
  const page = read("app/acceptance/figma-v3-calculator-step/page.tsx");
  const runner = read("scripts/run-node-tests.mjs");

  assert.ok(page.includes("CALCULATOR_STEP_VARIANTS.flatMap"));
  assert.ok(page.includes("CALCULATOR_STEP_STATES.map"));
  assert.ok(page.includes('showStateLabel={false}'));
  assert.ok(page.includes('testId="calculator-step-real-mobile"'));
  assert.ok(page.includes('data-private-learner-data="absent"'));
  assert.ok(page.includes('process.env.VERCEL_ENV !== "preview"'));
  assert.ok(runner.includes("tests/s232c1-calculator-step-parity.test.mjs"));
});

test("S232C.1 evidence records the exact Figma and runtime boundary", () => {
  const runbook = read("docs/qa/s232c1-calculator-step-parity.md");
  const browser = read("tests/e2e/s232c1-calculator-step.spec.ts");
  const workflow = read(".github/workflows/s232c1-runtime.yml");

  for (const phrase of [
    "53:129",
    "57:57",
    "3 × 3",
    "552 × 350",
    "350 × 380",
    "기기 검증 전",
    "desktop pixel parity",
    "metadata-only",
  ]) {
    assert.ok(runbook.includes(phrase), `runbook missing ${phrase}`);
  }
  assert.match(browser, /width: 390/);
  assert.match(browser, /width: 768/);
  assert.match(browser, /width: 1440/);
  assert.match(browser, /width: 720/);
  assert.match(browser, /toHaveCount\(9\)/);
  assert.match(browser, /blockingAxe/);
  assert.match(browser, /unexpectedTabStops/);
  assert.match(browser, /screenshot: "off", trace: "off", video: "off"/);
  assert.match(workflow, /pull_request\.number == 586/);
  assert.match(workflow, /agent\/s232c1-calculator-step-parity/);
  assert.match(workflow, /inverge-git-agent-s232c1-calculat-c75c6c-chachathecats-projects\.vercel\.app/);
  assert.match(workflow, /run-s232c1-auth-e2e/);
  assert.match(workflow, /E2E_TARGET_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow, /Postflight deployment SHA mismatch/);
  assert.match(workflow, /s232c1-runtime\.json/);
  assert.equal(workflow.includes("E2E_USER_PASSWORD"), false);
});
