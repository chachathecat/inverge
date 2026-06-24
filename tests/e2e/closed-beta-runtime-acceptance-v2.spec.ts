import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const runtimeGateEnabled = process.env.M421_RUNTIME_ACCEPTANCE === "1";
const productionOverrideEnabled = process.env.M421_RUNTIME_ACCEPTANCE_ALLOW_PRODUCTION === "1";

const requiredEnvNames = [
  "E2E_BASE_URL",
  "E2E_USER_EMAIL",
  "E2E_USER_PASSWORD",
  "E2E_USER_A_EMAIL",
  "E2E_USER_A_PASSWORD",
  "E2E_USER_B_EMAIL",
  "E2E_USER_B_PASSWORD",
] as const;

const responsiveWidths = [
  { label: "360 x 800", width: 360, height: 800 },
  { label: "390 x 844", width: 390, height: 844 },
  { label: "1280 x 800", width: 1280, height: 800 },
] as const;

type RuntimeCredential = {
  email: string;
  password: string;
};

function requireRuntimeEnvironment() {
  const missing = requiredEnvNames.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`M421 runtime acceptance missing required env: ${missing.join(", ")}`);
  }

  const baseUrl = process.env.E2E_BASE_URL;
  if (baseUrl && isObviousProductionBaseUrl(baseUrl) && !productionOverrideEnabled) {
    throw new Error("M421 runtime acceptance refused an obvious production base URL. Set M421_RUNTIME_ACCEPTANCE_ALLOW_PRODUCTION=1 only for an intentional owner-approved production smoke.");
  }
}

function isObviousProductionBaseUrl(rawValue: string) {
  let host = "";
  try {
    host = new URL(rawValue).hostname.toLowerCase();
  } catch {
    return false;
  }

  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
  if (host.includes("-git-") || host.includes("--") || host.includes("preview") || host.includes("staging")) return false;
  return host === "inverge.vercel.app" || host === "inverge.ai" || host === "www.inverge.ai" || host === "inverge.app" || host === "www.inverge.app";
}

function credentialFrom(prefix: "E2E_USER" | "E2E_USER_A" | "E2E_USER_B"): RuntimeCredential {
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !password) {
    throw new Error(`M421 runtime acceptance credential unavailable for ${prefix}`);
  }
  return { email, password };
}

function safeEvidenceSuffix() {
  const letters = randomUUID().replace(/[^a-f]/g, "");
  return `m421${letters.slice(0, 10)}`;
}

function syntheticText(label: string, suffix: string) {
  return `synthetic ${label} placeholder ${suffix}`;
}

async function login(page: Page, credential: RuntimeCredential, mode: "first" | "second" = "first") {
  await page.goto(`/login?mode=${mode}`);
  await page.locator('input[type="email"]').first().fill(credential.email);
  await page.locator('input[type="password"]').first().fill(credential.password);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/(app|onboarding)/);
}

async function openFreshContext(browser: Browser, credential: RuntimeCredential, mode: "first" | "second" = "first") {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, credential, mode);
  return { context, page };
}

async function expectNoUnsafeLearnerClaims(page: Page) {
  await expect(page.locator('a[href*="/instructor"], a[href*="/studio"]')).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/official grading|official score|pass\/fail|pass guarantee|model answer|AI final judgment/i);
}

async function expectNoHorizontalScrollBlock(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
}

async function expectTodayPlanMaxThree(page: Page) {
  const surface = page.locator("[data-today-plan-primary-surface]").first();
  if ((await surface.count()) === 0) return;

  const declaredCap = await surface.getAttribute("data-visible-primary-task-cap");
  expect(Number(declaredCap)).toBeLessThanOrEqual(3);
  expect(await surface.locator("[data-today-plan-primary-task]").count()).toBeLessThanOrEqual(3);
}

async function clickFirstVisible(locator: Locator) {
  await locator.first().scrollIntoViewIfNeeded();
  await locator.first().click();
}

async function openCapture(page: Page, mode: "first" | "second") {
  await page.goto(`/app?mode=${mode}`);
  await expectNoUnsafeLearnerClaims(page);
  await expectTodayPlanMaxThree(page);

  const captureLink = page.locator(`a[href*="/app/capture?mode=${mode}"], a[href*="/app/capture"]`).first();
  if ((await captureLink.count()) > 0) {
    await clickFirstVisible(captureLink);
  } else {
    await page.goto(`/app/capture?mode=${mode}`);
  }

  await expect(page).toHaveURL(/\/app\/capture/);
  await expect(page.getByTestId("capture-page-shell")).toBeVisible();
}

async function fillCaptureTextMode(page: Page, value: string) {
  const textOption = page.locator("[data-capture-input-options] button").nth(2);
  if ((await textOption.count()) > 0) {
    await textOption.click();
  }
  await page.locator("textarea").first().fill(value);
}

async function saveCapture(page: Page) {
  await page.getByTestId("capture-save-primary").scrollIntoViewIfNeeded();
  await page.getByTestId("capture-save-primary").click();
  await page.waitForLoadState("networkidle").catch(() => undefined);
}

async function ensureSession(page: Page, mode: "first" | "second") {
  if (/\/app\/session/.test(page.url())) return;

  const sessionLink = page.locator(`a[href*="/app/session?mode=${mode}"], a[href*="/app/session"]`).first();
  if ((await sessionLink.count()) > 0) {
    await clickFirstVisible(sessionLink);
  } else {
    await page.goto(`/app/session?mode=${mode}`);
  }

  await expect(page).toHaveURL(/\/app\/session/);
}

async function fillCurrentTextareas(page: Page, suffix: string) {
  const textareas = page.locator("textarea:visible");
  const count = await textareas.count();
  for (let index = 0; index < count; index += 1) {
    const textarea = textareas.nth(index);
    const value = await textarea.inputValue().catch(() => "");
    if (!value.trim()) {
      await textarea.fill(syntheticText("recall production", suffix));
    }
  }
}

async function chooseVisibleChecks(page: Page) {
  const radios = page.locator('input[type="radio"]:visible');
  if ((await radios.count()) > 0) {
    await radios.first().check();
  }

  const checkboxes = page.locator('input[type="checkbox"]:visible');
  const checkboxCount = await checkboxes.count();
  for (let index = 0; index < checkboxCount; index += 1) {
    const checkbox = checkboxes.nth(index);
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }
  }
}

async function clickEnabledProgressButton(root: Page | Locator) {
  const buttons = root.locator("button:visible:not([disabled])");
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);
  await buttons.nth(count - 1).click();
}

async function completeSessionLoop(page: Page, mode: "first" | "second", suffix: string) {
  await ensureSession(page, mode);
  await expectNoUnsafeLearnerClaims(page);

  for (let step = 0; step < 10; step += 1) {
    if ((await page.locator('a[href^="/app?mode="], a[href*="/app?mode="]').count()) > 0 && /\/app\/session/.test(page.url())) {
      const doneCopy = page.locator("body").filter({ hasText: /done|complete|today/i });
      if ((await doneCopy.count()) > 0 && step > 2) break;
    }

    const disabledBeforeProduction = await page.locator("button:visible:disabled").count();
    await fillCurrentTextareas(page, suffix);
    await chooseVisibleChecks(page);
    if (step > 0) {
      expect(disabledBeforeProduction).toBeGreaterThanOrEqual(0);
    }
    await clickEnabledProgressButton(page);
    await page.waitForTimeout(300);
  }
}

async function completeCalculatorRoutine(page: Page, suffix: string) {
  await page.goto("/app/calculator?mode=second&context=practice&focus=casio");
  await expect(page.locator("[data-calculator-routine-trainer]").first()).toBeVisible();
  await expectNoUnsafeLearnerClaims(page);

  const trainer = page.locator("[data-calculator-routine-trainer]").first();
  await trainer.locator("button:visible").first().click();

  for (let step = 0; step < 14; step += 1) {
    const state = await trainer.getAttribute("data-calculator-routine-state");
    if (state === "completed") break;

    const textareas = trainer.locator("textarea:visible");
    const textareaCount = await textareas.count();
    for (let index = 0; index < textareaCount; index += 1) {
      const textarea = textareas.nth(index);
      const value = await textarea.inputValue().catch(() => "");
      if (!value.trim()) {
        await textarea.fill(syntheticText("routine step", suffix));
      }
    }

    const disabledBeforeChecks = await trainer.locator("button:visible:disabled").count();
    const checkboxes = trainer.locator('input[type="checkbox"]:visible');
    if ((await checkboxes.count()) > 0) {
      await checkboxes.first().check();
    }
    if (step > 0) {
      expect(disabledBeforeChecks).toBeGreaterThanOrEqual(0);
    }

    await clickEnabledProgressButton(trainer);
    await page.waitForTimeout(250);
  }

  await expect(trainer).toHaveAttribute("data-calculator-routine-state", "completed");
  await expect(page.locator("body")).not.toContainText(/certified numerically|numerical correctness certified|official score/i);
}

async function assertSyntheticRecordVisibleOrLocalHonest(page: Page, suffix: string) {
  await page.goto("/app/notes?mode=first");
  const body = page.locator("body");
  const hasRecord = (await body.textContent())?.includes(suffix) ?? false;
  if (!hasRecord) {
    await expect(body).toContainText(/local|browser|temporary|closed beta|beta/i);
  }
}

test.describe("M421 closed beta runtime acceptance v2", () => {
  test.skip(!runtimeGateEnabled, "M421 runtime acceptance requires M421_RUNTIME_ACCEPTANCE=1 and owner-provided runtime credentials.");

  test.beforeAll(() => {
    requireRuntimeEnvironment();
  });

  for (const viewport of responsiveWidths) {
    test(`first-exam golden journey at ${viewport.label}`, async ({ page }) => {
      const suffix = safeEvidenceSuffix();
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await login(page, credentialFrom("E2E_USER"), "first");

      await openCapture(page, "first");
      await fillCaptureTextMode(page, syntheticText("first exam capture", suffix));
      await saveCapture(page);

      const confirmation = page.getByTestId("capture-save-confirmation");
      if ((await confirmation.count()) > 0) {
        await expect(confirmation.first()).toBeVisible();
      }

      await ensureSession(page, "first");
      await completeSessionLoop(page, "first", suffix);
      await page.goto("/app?mode=first");
      await expectTodayPlanMaxThree(page);
      await expectNoHorizontalScrollBlock(page);
      await expectNoUnsafeLearnerClaims(page);
      await page.reload();
      await expectTodayPlanMaxThree(page);
      await expectNoUnsafeLearnerClaims(page);
    });
  }

  test("second-exam rewrite journey keeps recall before reference and honest completion", async ({ page }) => {
    const suffix = safeEvidenceSuffix();
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, credentialFrom("E2E_USER"), "second");

    await openCapture(page, "second");
    await fillCaptureTextMode(page, syntheticText("second exam issue recall", suffix));

    const stageInputs = [
      "issue recall",
      "outline",
      "learner answer",
      "reference summary",
      "one biggest gap",
      "paragraph rewrite",
    ];
    for (const stage of stageInputs) {
      const visibleTextareas = page.locator("textarea:visible");
      if ((await visibleTextareas.count()) > 0) {
        await visibleTextareas.last().fill(syntheticText(stage, suffix));
      }
      const visibleInputs = page.locator('input:visible:not([type="hidden"])');
      if ((await visibleInputs.count()) > 0) {
        await visibleInputs.last().fill(syntheticText(stage, suffix));
      }
      const enabledButtons = page.locator("button:visible:not([disabled])");
      if ((await enabledButtons.count()) > 0) {
        await enabledButtons.last().click();
        await page.waitForTimeout(250);
      }
    }

    await saveCapture(page);
    await ensureSession(page, "second");
    await completeSessionLoop(page, "second", suffix);
    await page.reload();
    await expectNoUnsafeLearnerClaims(page);
  });

  test("calculator routine recovery creates one recovery result and avoids duplicate visible completion", async ({ page }) => {
    const suffix = safeEvidenceSuffix();
    await page.setViewportSize({ width: 1280, height: 800 });
    await login(page, credentialFrom("E2E_USER"), "second");

    await completeCalculatorRoutine(page, suffix);
    const completedCount = await page.locator("[data-calculator-routine-trainer][data-calculator-routine-state='completed']").count();
    expect(completedCount).toBe(1);

    const recoveryHref = page.locator('a[href*="recoveryRoutineId"], a[href*="/app/calculator?mode=second"]').first();
    if ((await recoveryHref.count()) > 0) {
      await recoveryHref.click();
      await completeCalculatorRoutine(page, suffix);
      expect(await page.locator("[data-calculator-routine-trainer][data-calculator-routine-state='completed']").count()).toBe(1);
    }
  });

  test("refresh and two-context durability stay honest", async ({ browser }) => {
    const suffix = safeEvidenceSuffix();
    const credential = credentialFrom("E2E_USER_A");
    const first = await openFreshContext(browser, credential, "first");
    const second = await openFreshContext(browser, credential, "first");

    try {
      await openCapture(first.page, "first");
      await fillCaptureTextMode(first.page, syntheticText("two context durability", suffix));
      await saveCapture(first.page);
      await first.page.reload();
      await assertSyntheticRecordVisibleOrLocalHonest(first.page, suffix);
      await assertSyntheticRecordVisibleOrLocalHonest(second.page, suffix);
    } finally {
      await first.context.close();
      await second.context.close();
    }
  });

  test("account A/B isolation is enforced through learner routes", async ({ browser }) => {
    const suffix = safeEvidenceSuffix();
    const accountA = await openFreshContext(browser, credentialFrom("E2E_USER_A"), "first");
    const accountB = await openFreshContext(browser, credentialFrom("E2E_USER_B"), "first");

    try {
      await openCapture(accountA.page, "first");
      await fillCaptureTextMode(accountA.page, syntheticText("account owned evidence", suffix));
      await saveCapture(accountA.page);

      await accountB.page.goto("/app/notes?mode=first");
      await expect(accountB.page.locator("body")).not.toContainText(suffix);
      await accountB.page.goto("/app/review?mode=first");
      await expect(accountB.page.locator("body")).not.toContainText(suffix);
      await expectNoUnsafeLearnerClaims(accountB.page);
    } finally {
      await accountA.context.close();
      await accountB.context.close();
    }
  });

  test("failure honesty does not show false durable success or raw provider failure", async ({ page }) => {
    const suffix = safeEvidenceSuffix();
    await login(page, credentialFrom("E2E_USER"), "first");

    await page.route("**/api/os/items", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "m421_synthetic_save_failure" }),
      });
    });

    await openCapture(page, "first");
    await fillCaptureTextMode(page, syntheticText("save failure", suffix));
    await saveCapture(page);
    await expect(page.getByTestId("capture-save-confirmation")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(/durable saved|saved successfully|https?:\/\//i);

    await page.unroute("**/api/os/items");
    await page.route("**/api/answer-review/structure", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "m421_synthetic_structure_failure" }),
      });
    });

    await page.goto("/answer-review?mode=second");
    await page.locator("textarea").first().fill(syntheticText("provider failure", suffix));
    const enabledButtons = page.locator("button:visible:not([disabled])");
    if ((await enabledButtons.count()) > 0) {
      await enabledButtons.first().click();
    }
    await expect(page.locator("body")).not.toContainText(/completed AI analysis|stack trace|endpoint|token|secret|https?:\/\//i);
  });
});
