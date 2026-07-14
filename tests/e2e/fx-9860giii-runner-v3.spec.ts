import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const runtimeEnabled = process.env.S229_AUTH_RUNTIME === "1";
const runtimeBaseUrl = process.env.E2E_BASE_URL?.trim() ?? "";
const testEmail = process.env.E2E_USER_EMAIL?.trim() ?? "";
const testPassword = process.env.E2E_USER_PASSWORD ?? "";
const vercelBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ?? "";
const expectedPreviewHost = "inverge-git-agent-s229-giii-runner-v3-chachathecats-projects.vercel.app";
const draftStoragePrefix = "inverge.calculatorRoutine.draft.v1:";
const canonicalStepIds = [
  "conditions",
  "formula",
  "numbers_units",
  "casio_input",
  "display_value",
  "answer_value",
  "unit_rounding",
  "verification",
  "mistake_type",
] as const;

const syntheticEntries: Record<(typeof canonicalStepIds)[number], string> = {
  conditions: "합성 조건을 원문과 대조했습니다.",
  formula: "합성 산식 A = B × C를 선택했습니다.",
  numbers_units: "합성 값 100원 × 2회를 확인했습니다.",
  casio_input: "100 × 2 EXE 합성 입력을 직접 확인했습니다.",
  display_value: "합성 화면값 200을 확인했습니다.",
  answer_value: "합성 답안 기재값 200원을 확인했습니다.",
  unit_rounding: "원 단위 반올림 기준을 확인했습니다.",
  verification: "",
  mistake_type: "",
};

const protectionHeaders: Record<string, string> = vercelBypassSecret
  ? {
      "x-vercel-protection-bypass": vercelBypassSecret,
      "x-vercel-set-bypass-cookie": "true",
    }
  : {};

test.use({
  extraHTTPHeaders: protectionHeaders,
  screenshot: "off",
  trace: "off",
  video: "off",
});

test.skip(!runtimeEnabled, "Set S229_AUTH_RUNTIME=1 for the owner-approved authenticated runtime acceptance.");

function requireSafeRuntimeEnvironment() {
  const missing = [
    ["E2E_BASE_URL", runtimeBaseUrl],
    ["E2E_USER_EMAIL", testEmail],
    ["E2E_USER_PASSWORD", testPassword],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error("S229 runtime acceptance missing required env: " + missing.join(", "));
  }

  const url = new URL(runtimeBaseUrl);
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== expectedPreviewHost) {
    throw new Error("S229 runtime acceptance refuses production and non-approved hosts. Use the exact S229 Vercel Preview URL.");
  }
  if (!vercelBypassSecret) {
    throw new Error("S229 runtime acceptance requires VERCEL_AUTOMATION_BYPASS_SECRET for the protected Preview.");
  }
}

function sanitizeEvidence(value: string) {
  let sanitized = value;
  if (testEmail) sanitized = sanitized.replaceAll(testEmail, "[redacted-email]");
  if (testPassword) sanitized = sanitized.replaceAll(testPassword, "[redacted-password]");
  if (vercelBypassSecret) sanitized = sanitized.replaceAll(vercelBypassSecret, "[redacted-bypass]");
  return sanitized;
}

async function login(page: Page) {
  await page.goto("/login?mode=second", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("이메일")).toBeVisible();
  await page.getByLabel("이메일").fill(testEmail);
  await page.getByLabel("비밀번호").fill(testPassword);

  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) => {
        const url = new URL(candidate.url());
        return candidate.request().method() === "POST" && url.pathname === "/api/auth/sign-in";
      },
      { timeout: 20_000 },
    ),
    page.getByTestId("login-submit").click(),
  ]);

  expect(response.ok(), "The app login endpoint must accept the dedicated test account.").toBe(true);
  await expect(page).toHaveURL((url) => url.pathname === "/app");
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "The calculator page must not scroll horizontally.").toBeLessThanOrEqual(2);
}

async function tabToPrimaryAction(
  page: Page,
  trainer: Locator,
  primaryAction: Locator,
  testInfo: TestInfo,
) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });

  let tabStops = 0;
  let reached = false;
  while (tabStops < 40 && !reached) {
    await page.keyboard.press("Tab");
    tabStops += 1;
    reached = await primaryAction.evaluate((element) => element === document.activeElement);
  }

  try {
    expect(reached, "The primary calculator continuation must be reachable with Tab.").toBe(true);
    await expect(primaryAction, "The browser must scroll the keyboard-focused CTA into view.").toBeInViewport();
    const focusState = await primaryAction.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        height: rect.height,
        visible:
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth,
        hasIndicator:
          (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0) ||
          (style.boxShadow !== "none" && style.boxShadow.length > 0),
      };
    });
    expect(focusState.height, "The primary CTA must be at least 44px high.").toBeGreaterThanOrEqual(44);
    expect(focusState.visible, "The focused CTA must stay visible.").toBe(true);
    expect(focusState.hasIndicator, "The focused CTA must expose a visible focus indicator.").toBe(true);
    await expect(trainer.locator("[data-calculator-routine-active-step]")).toHaveCount(1);
    return tabStops;
  } catch (error) {
    const geometry = await primaryAction
      .evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          height: Math.round(rect.height),
          viewportHeight: window.innerHeight,
          focused: element === document.activeElement,
        };
      })
      .catch(() => null);
    const screenshot = "s229-focus-failure-390.png";
    await captureRunnerEvidence(trainer, testInfo, screenshot).catch(() => undefined);
    await writeFile(
      testInfo.outputPath("s229-runtime.json"),
      JSON.stringify(
        {
          result: "fail",
          stage: "keyboard-focus",
          reached,
          tabStops,
          geometry,
          activeStepCount: await trainer.locator("[data-calculator-routine-active-step]").count(),
          realDeviceVerified: false,
          deviceStatus: "기기 검증 전",
          screenshots: [screenshot],
        },
        null,
        2,
      ),
      "utf8",
    );
    throw error;
  }
}

async function captureRunnerEvidence(trainer: Locator, testInfo: TestInfo, fileName: string) {
  const path = testInfo.outputPath(fileName);
  await trainer.screenshot({ path, animations: "disabled" });
  return fileName;
}

async function clearCalculatorRoutineSessionDrafts(page: Page) {
  await page.evaluate((prefix) => {
    for (const key of Object.keys(window.sessionStorage)) {
      if (key.startsWith(prefix)) window.sessionStorage.removeItem(key);
    }
  }, draftStoragePrefix);
}

async function expectPreLoopRunnerState(trainer: Locator, testInfo: TestInfo) {
  try {
    await expect(trainer).toHaveAttribute("data-calculator-routine-state", "active");
    await expect(trainer).toHaveAttribute("data-calculator-routine-view-state", "active");
    await expect(trainer.locator("[data-calculator-routine-active-step]")).toHaveCount(1);
    await expect(trainer.locator("[data-calculator-routine-active-step]")).toHaveAttribute(
      "data-calculator-routine-active-step",
      "conditions",
    );
  } catch (error) {
    const diagnostic = await trainer.evaluate((element) => ({
      state: element.getAttribute("data-calculator-routine-state"),
      viewState: element.getAttribute("data-calculator-routine-view-state"),
      activeStepCount: element.querySelectorAll("[data-calculator-routine-active-step]").length,
    }));
    const screenshot = "s229-pre-loop-failure.png";
    await captureRunnerEvidence(trainer, testInfo, screenshot).catch(() => undefined);
    await writeFile(
      testInfo.outputPath("s229-runtime.json"),
      JSON.stringify(
        {
          result: "fail",
          stage: "pre-loop",
          ...diagnostic,
          realDeviceVerified: false,
          deviceStatus: "기기 검증 전",
          screenshots: [screenshot],
        },
        null,
        2,
      ),
      "utf8",
    );
    throw error;
  }
}

test.describe("S229 authenticated fx-9860GIII runner acceptance", () => {
  test.describe.configure({ timeout: 180_000, retries: 0 });

  test("390/1440, keyboard, nine steps, recovery, and zero browser errors", async ({ page }, testInfo) => {
    requireSafeRuntimeEnvironment();

    const runtimeOrigin = new URL(runtimeBaseUrl).origin;
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const sameOriginErrors: string[] = [];
    const screenshots: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(sanitizeEvidence(message.text()));
    });
    page.on("pageerror", (error) => {
      pageErrors.push(sanitizeEvidence(error.message));
    });
    page.on("requestfailed", (request) => {
      const url = new URL(request.url());
      const failure = request.failure()?.errorText ?? "unknown";
      if (url.origin !== runtimeOrigin || failure.includes("ERR_ABORTED")) return;
      sameOriginErrors.push(sanitizeEvidence(request.method() + " " + url.pathname + " " + failure));
    });
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (url.origin !== runtimeOrigin || response.status() < 400) return;
      sameOriginErrors.push(sanitizeEvidence(response.request().method() + " " + url.pathname + " HTTP " + response.status()));
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await clearCalculatorRoutineSessionDrafts(page);
    await page.goto("/app/calculator?mode=second&context=practice&focus=casio", {
      waitUntil: "domcontentloaded",
    });

    const trainer = page.locator("[data-calculator-routine-trainer]");
    await expect(trainer).toHaveCount(1);
    await expect(trainer).toBeVisible();
    await expect(trainer).toContainText("CASIO fx-9860GIII");
    await expect(trainer).toContainText("기기 검증 전");
    await expectNoHorizontalOverflow(page);
    await expect(trainer).toHaveAttribute("data-calculator-routine-state", "collapsed");

    await trainer.getByRole("button", { name: /루틴 시작/ }).click();
    await expectPreLoopRunnerState(trainer, testInfo);
    const observedStepIds: string[] = [];
    let tabStopsToPrimaryAction = 0;

    for (const [index, expectedStepId] of canonicalStepIds.entries()) {
      const activeStep = trainer.locator("[data-calculator-routine-active-step]");
      await expect(activeStep).toHaveCount(1);
      await expect(activeStep).toHaveAttribute("data-calculator-routine-active-step", expectedStepId);
      observedStepIds.push(expectedStepId);

      if (expectedStepId === "verification") {
        await activeStep.getByLabel("역산", { exact: true }).check();
      } else if (expectedStepId === "mistake_type") {
        await activeStep.getByLabel("실수 없음", { exact: true }).check();
      } else {
        await activeStep.locator("textarea").fill(syntheticEntries[expectedStepId]);
      }

      const primaryAction = trainer.getByRole("button", {
        name: index === canonicalStepIds.length - 1 ? "계산·검산 루틴 완료" : /^다음 · /,
      });
      await expect(primaryAction).toBeEnabled();

      if (index === 0) {
        tabStopsToPrimaryAction = await tabToPrimaryAction(page, trainer, primaryAction, testInfo);
        screenshots.push(await captureRunnerEvidence(trainer, testInfo, "s229-active-focus-390.png"));
        await page.keyboard.press("Enter");
      } else {
        await primaryAction.click();
      }
    }

    expect(observedStepIds).toEqual(canonicalStepIds);
    await expect(trainer).toHaveAttribute("data-calculator-routine-state", "completed");
    await expect(trainer).toContainText("9/9 단계 기록됨");
    await expect(trainer).toContainText("기기 검증 전");
    await expect(
      page.getByText(/학습 기록에 연결됨|이미 연결된 학습 기록입니다/),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    screenshots.push(await captureRunnerEvidence(trainer, testInfo, "s229-completed-390.png"));

    const routineId = await page.evaluate((prefix) => {
      const key = Object.keys(window.sessionStorage).find((candidate) => candidate.startsWith(prefix));
      return key ? key.slice(prefix.length) : "";
    }, draftStoragePrefix);
    expect(routineId.startsWith("answer-review-"), "A metadata-only recovery routine ID must be available.").toBe(true);

    await page.setViewportSize({ width: 1440, height: 1024 });
    await expectNoHorizontalOverflow(page);
    screenshots.push(await captureRunnerEvidence(trainer, testInfo, "s229-completed-1440.png"));

    const recoveryParams = new URLSearchParams({
      mode: "second",
      context: "practice",
      focus: "casio",
      recoveryRoutineId: routineId,
      recoverySource: "answer-review",
    });
    await page.goto("/app/calculator?" + recoveryParams.toString(), { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-calculator-routine-recovery-section]")).toBeVisible();
    const recoveryTrainer = page.locator("[data-calculator-routine-trainer]");
    await expect(recoveryTrainer).toHaveCount(1);
    await recoveryTrainer.getByRole("button", { name: /루틴 시작/ }).click();
    await expect(recoveryTrainer.locator("[data-calculator-routine-active-step]")).toHaveCount(1);
    await expect(recoveryTrainer.locator("[data-calculator-routine-active-step]")).toHaveAttribute(
      "data-calculator-routine-active-step",
      "mistake_type",
    );
    await recoveryTrainer.getByRole("button", { name: "계산·검산 루틴 완료" }).click();
    await expect(recoveryTrainer).toHaveAttribute("data-calculator-routine-state", "completed");
    await expectNoHorizontalOverflow(page);
    screenshots.push(await captureRunnerEvidence(recoveryTrainer, testInfo, "s229-recovery-completed-1440.png"));

    const cleanRuntime = consoleErrors.length === 0 && pageErrors.length === 0 && sameOriginErrors.length === 0;
    const manifest = {
      result: cleanRuntime ? "pass" : "fail",
      previewHost: expectedPreviewHost,
      viewports: ["390x844", "1440x1024"],
      activeStepCount: 1,
      completedStepIds: observedStepIds,
      tabStopsToPrimaryAction,
      primaryActionMinHeight: 44,
      horizontalOverflow: "pass",
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: pageErrors.length,
      sameOriginErrorCount: sameOriginErrors.length,
      directCasio: "pass",
      recovery: "pass",
      realDeviceVerified: false,
      deviceStatus: "기기 검증 전",
      screenshots,
    };
    await writeFile(
      testInfo.outputPath("s229-runtime.json"),
      JSON.stringify(manifest, null, 2),
      "utf8",
    );

    expect(consoleErrors, "Browser console errors must be zero.").toEqual([]);
    expect(pageErrors, "Uncaught page errors must be zero.").toEqual([]);
    expect(sameOriginErrors, "Same-origin request and HTTP errors must be zero.").toEqual([]);
  });
});
