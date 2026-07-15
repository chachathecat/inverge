import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

import {
  establishProtectedPreviewSession,
  loginWithDedicatedTestAccount,
  monitorRuntimeErrors,
  requireSafeAuthenticatedRuntime,
  runtimeRunnerSha,
  runtimeTargetSha,
} from "./support/authenticated-runtime";

const runtimeEnabled = process.env.S232C2_AUTH_RUNTIME === "1";

const syntheticEntries = {
  conditions: "합성 조건을 직접 확인했습니다.",
  formula: "A = B × C 합성 산식을 직접 기록했습니다.",
  numbers_units: "합성 값 100원과 2회를 직접 확인했습니다.",
  casio_input: "100 × 2 EXE 합성 키 순서를 직접 기록했습니다.",
  display_value: "합성 화면값 200을 직접 기록했습니다.",
  answer_value: "합성 답안 기재값 200원을 직접 기록했습니다.",
} as const;

const viewports = [
  { label: "390", width: 390, height: 844 },
  { label: "1440", width: 1440, height: 1024 },
  { label: "1440-at-200-percent-equivalent", width: 720, height: 1024 },
] as const;

test.use({ screenshot: "off", trace: "off", video: "off" });
test.skip(!runtimeEnabled, "Set S232C2_AUTH_RUNTIME=1 for exact-head runner acceptance.");
test.describe.configure({ timeout: 300_000, retries: 0 });

async function expectExactDeployment(page: Page) {
  const version = await page.evaluate(async () => {
    const response = await fetch("/api/runtime/version", {
      cache: "no-store",
      credentials: "same-origin",
    });
    return {
      status: response.status,
      body: await response.json() as { ready?: boolean; deploymentSha?: string },
    };
  });
  expect(version.status).toBe(200);
  expect(version.body.ready).toBe(true);
  expect(version.body.deploymentSha).toBe(runtimeTargetSha);
  return version.body.deploymentSha;
}

async function fillAndAdvance(page: Page, stepId: keyof typeof syntheticEntries) {
  const active = page.locator(`[data-calculator-routine-active-step="${stepId}"]`);
  await expect(active).toBeVisible();
  const textarea = active.locator("textarea");
  await expect(textarea).toHaveCount(1);
  await textarea.fill(syntheticEntries[stepId]);
  await page.getByRole("button", { name: /다음/ }).click();
}

test("S232C.2 exact-head authenticated CalculatorStep runner integration", async ({ page }, testInfo: TestInfo) => {
  requireSafeAuthenticatedRuntime("S232C.2", {
    requireTargetSha: true,
    requireExactHead: true,
  });
  const runtimeErrors = monitorRuntimeErrors(page);
  await establishProtectedPreviewSession(page, "S232C.2");
  const { signInAttempts } = await loginWithDedicatedTestAccount(page, "second");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/calculator?mode=second&context=practice&focus=casio", {
    waitUntil: "domcontentloaded",
  });
  const trainer = page.locator("[data-calculator-routine-v3]");
  await expect(trainer).toBeVisible({ timeout: 20_000 });
  const observedDeploymentSha = await expectExactDeployment(page);
  await expect(trainer.locator('ol[aria-label="계산·검산 9단계 진행"] > li')).toHaveCount(9);

  await page.getByRole("button", { name: /루틴 시작/ }).click();
  await fillAndAdvance(page, "conditions");
  await fillAndAdvance(page, "formula");
  await fillAndAdvance(page, "numbers_units");

  const casioStep = trainer.getByTestId("calculator-step-runner-v3");
  await expect(casioStep).toHaveCount(1);
  await expect(casioStep).toHaveAttribute("data-v3-step", "KeyInput");
  await expect(casioStep).toHaveAttribute("data-v3-state", "Current");
  await expect(casioStep).toHaveAttribute("data-device-verified", "false");
  await expect(casioStep).toHaveAttribute("data-state-label-visible", "false");
  await expect(casioStep.locator("a[href],button,input,textarea,select,[tabindex]")).toHaveCount(0);

  const casioTextarea = trainer
    .locator('[data-calculator-routine-active-step="casio_input"]')
    .locator("textarea");
  await casioTextarea.fill(syntheticEntries.casio_input);
  await expect(casioStep).toHaveAttribute("data-v3-state", "Complete");
  await page.getByRole("button", { name: /다음/ }).click();

  const displayStep = trainer.getByTestId("calculator-step-runner-v3");
  await expect(displayStep).toHaveAttribute("data-v3-step", "Display");
  await expect(displayStep).toHaveAttribute("data-v3-state", "Current");
  const displayTextarea = trainer
    .locator('[data-calculator-routine-active-step="display_value"]')
    .locator("textarea");
  await displayTextarea.fill(syntheticEntries.display_value);
  await expect(displayStep).toHaveAttribute("data-v3-state", "Complete");
  await page.getByRole("button", { name: /다음/ }).click();

  const transferStep = trainer.getByTestId("calculator-step-runner-v3");
  await expect(transferStep).toHaveAttribute("data-v3-step", "Transfer");
  await expect(transferStep).toHaveAttribute("data-v3-state", "Current");
  const transferTextarea = trainer
    .locator('[data-calculator-routine-active-step="answer_value"]')
    .locator("textarea");
  await transferTextarea.fill(syntheticEntries.answer_value);
  await expect(transferStep).toHaveAttribute("data-v3-state", "Complete");

  await page.getByRole("button", { name: "이전 단계" }).click();
  await expect(trainer.getByTestId("calculator-step-runner-v3")).toHaveAttribute(
    "data-v3-step",
    "Display",
  );
  await expect(
    trainer.locator('[data-calculator-routine-active-step="display_value"] textarea'),
  ).toHaveValue(syntheticEntries.display_value);
  await page.getByRole("button", { name: "이전 단계" }).click();
  await expect(trainer.getByTestId("calculator-step-runner-v3")).toHaveAttribute(
    "data-v3-step",
    "KeyInput",
  );
  await expect(casioTextarea).toHaveValue(syntheticEntries.casio_input);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /루틴 시작/ }).click();
  const restored = page.locator('[data-calculator-routine-active-step="casio_input"]');
  await expect(restored).toBeVisible();
  await expect(restored.locator("textarea")).toHaveValue(syntheticEntries.casio_input);
  await expect(restored.getByTestId("calculator-step-runner-v3")).toHaveAttribute(
    "data-v3-state",
    "Complete",
  );
  await restored.locator("textarea").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "참고 신호 보기" })).toBeFocused();

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expect(restored.getByTestId("calculator-step-runner-v3")).toBeVisible();
    const overflow = await page.evaluate(
      () => Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    );
    expect(overflow, `horizontal overflow at ${viewport.label}`).toBeLessThanOrEqual(2);
  }

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const blockingAxe = axe.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );
  expect(blockingAxe).toEqual([]);
  expect(runtimeErrors).toEqual({
    consoleErrors: [],
    pageErrors: [],
    sameOriginRequestFailures: [],
  });

  const evidence = {
    schemaVersion: 1,
    result: "pass",
    runnerSha: runtimeRunnerSha,
    targetDeploymentSha: runtimeTargetSha,
    observedDeploymentSha,
    signInAttempts,
    viewportCount: viewports.length,
    mappedVariantCount: 3,
    mappedCompleteTransitionCount: 3,
    canonicalStepCount: 9,
    sessionPersistenceVerified: true,
    keyboardOrderVerified: true,
    passivePrimitiveTabStopCount: 0,
    axeBlockingCount: blockingAxe.length,
    consoleErrorCount: runtimeErrors.consoleErrors.length,
    pageErrorCount: runtimeErrors.pageErrors.length,
    sameOriginRequestFailureCount: runtimeErrors.sameOriginRequestFailures.length,
    rawLearnerContentCaptured: false,
    credentialsCaptured: false,
    screenshotCaptured: false,
    traceCaptured: false,
    videoCaptured: false,
  };
  expect(JSON.stringify(evidence)).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
  await writeFile(testInfo.outputPath("s232c2-runtime.json"), JSON.stringify(evidence, null, 2));
});
