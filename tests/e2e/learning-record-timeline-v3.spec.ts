import { expect, test, type Locator, type Page, type Response, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const expectedPreviewUrl = "https://inverge-git-agent-s230-learning-r-546b4c-chachathecats-projects.vercel.app";
const expectedPreviewHost = new URL(expectedPreviewUrl).hostname;
const expectedProductSha = "1231389c0b45344dbc84eccb6c434c1db99438e2";
const runtimeEnabled = process.env.S230_AUTH_RUNTIME === "1";
const runtimeBaseUrl = process.env.E2E_BASE_URL?.trim() ?? "";
const runtimeRunnerHeadSha = process.env.S230_RUNNER_HEAD_SHA?.trim() ?? "";
const runtimeProductSha = process.env.S230_PRODUCT_SHA?.trim() ?? "";
const testEmail = process.env.E2E_USER_EMAIL?.trim() ?? "";
const testPassword = process.env.E2E_USER_PASSWORD ?? "";
const vercelBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ?? "";

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

test.skip(!runtimeEnabled, "Set S230_AUTH_RUNTIME=1 only for the PR-scoped authenticated runtime acceptance.");

function requireSafeRuntimeEnvironment() {
  const missing = [
    ["E2E_BASE_URL", runtimeBaseUrl],
    ["E2E_USER_EMAIL", testEmail],
    ["E2E_USER_PASSWORD", testPassword],
    ["VERCEL_AUTOMATION_BYPASS_SECRET", vercelBypassSecret],
    ["S230_RUNNER_HEAD_SHA", runtimeRunnerHeadSha],
    ["S230_PRODUCT_SHA", runtimeProductSha],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error("S230 runtime acceptance missing required env: " + missing.join(", "));
  }

  const url = new URL(runtimeBaseUrl);
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== expectedPreviewHost) {
    throw new Error("S230 runtime acceptance refuses any host except the exact PR #566 Vercel Preview.");
  }
  if (runtimeProductSha !== expectedProductSha) {
    throw new Error("S230 runtime acceptance refuses an unpinned product deployment SHA.");
  }
}

function sanitizeEvidence(value: string) {
  let sanitized = value;
  if (testEmail) sanitized = sanitized.replaceAll(testEmail, "[redacted-email]");
  if (testPassword) sanitized = sanitized.replaceAll(testPassword, "[redacted-password]");
  if (vercelBypassSecret) sanitized = sanitized.replaceAll(vercelBypassSecret, "[redacted-bypass]");
  return sanitized;
}

function isSignInResponse(candidate: Response) {
  const url = new URL(candidate.url());
  return candidate.request().method() === "POST" && url.pathname === "/api/auth/sign-in";
}

async function waitForHydratedLoginForm(page: Page) {
  const emailInput = page.getByLabel("이메일");
  const passwordInput = page.getByLabel("비밀번호");
  const submit = page.getByTestId("login-submit");

  await expect(emailInput).toBeVisible({ timeout: 20_000 });
  await expect(passwordInput).toBeVisible({ timeout: 20_000 });
  await expect(submit).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(
      () =>
        submit.evaluate((element) =>
          Object.keys(element).some(
            (key) => key.startsWith("__reactProps$") || key.startsWith("__reactFiber$"),
          ),
        ),
      { timeout: 20_000, message: "The login form must be client-hydrated before submission." },
    )
    .toBe(true);

  // Exercise the controlled input handlers after hydration, then restore the secret-backed values.
  await emailInput.fill("hydration-check@inverge.invalid");
  await expect(emailInput).toHaveValue("hydration-check@inverge.invalid");
  await emailInput.fill(testEmail);
  await passwordInput.fill(testPassword);
  await expect(emailInput).toHaveValue(testEmail);
  await expect(passwordInput).toHaveValue(testPassword);
  await expect(submit).toBeEnabled({ timeout: 20_000 });

  return { emailInput, passwordInput, submit };
}

async function clickForSignInResponse(page: Page, submit: Locator) {
  const responsePromise = page.waitForResponse(isSignInResponse, { timeout: 20_000 }).catch((error: unknown) => {
    if (error instanceof Error && error.name === "TimeoutError") return null;
    throw error;
  });
  await submit.click({ timeout: 20_000 });
  return responsePromise;
}

async function login(page: Page) {
  await page.goto("/login?mode=second", { waitUntil: "domcontentloaded", timeout: 30_000 });
  if (new URL(page.url()).pathname === "/app") return;

  let form = await waitForHydratedLoginForm(page);
  let response = await clickForSignInResponse(page, form.submit);

  // A single no-request retry covers the SSR-to-hydration click race. HTTP failures are never retried.
  if (!response) {
    form = await waitForHydratedLoginForm(page);
    response = await clickForSignInResponse(page, form.submit);
  }

  if (!response) {
    throw new Error("The hydrated login form emitted no sign-in request after one bounded retry.");
  }

  const status = response.status();
  if ([400, 401, 403].includes(status)) {
    throw new Error(`The dedicated invited account sign-in returned ${status}; credential failures are not retried.`);
  }
  if (!response.ok()) {
    throw new Error(`The dedicated invited account sign-in returned HTTP ${status}.`);
  }

  await expect(page).toHaveURL((url) => url.pathname === "/app", { timeout: 20_000 });
}

async function openExactHeadAgenda(page: Page) {
  const root = page.locator("[data-s230-learning-record-timeline]");

  for (let attempt = 0; attempt < 18; attempt += 1) {
    await page.goto("/app/agenda?mode=second", { waitUntil: "domcontentloaded" });
    if (await root.isVisible().catch(() => false)) return;
    await page.waitForTimeout(5_000);
  }

  await expect(root, "The branch Preview must serve the exact S230 agenda head.").toBeVisible();
}

async function expectAgendaLayout(page: Page) {
  const root = page.locator("[data-s230-learning-record-timeline]");
  await expect(root).toBeVisible();
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1, name: "배운 흐름을 다시 이어봅니다" })).toBeVisible();
  await expect(page.locator("[data-s230-dominant-next-action]")).toHaveCount(1);
  await expect(page.locator("[data-s230-dominant-next-action]")).toBeVisible();

  const state = await root.getAttribute("data-s230-state");
  expect(["ready", "empty"]).toContain(state);
  if (state === "ready") {
    await expect(page.locator("[data-s230-primary-timeline]")).toBeVisible();
    await expect(page.locator("[data-s230-next-review]")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "회복의 시간순 기록" })).toBeVisible();
  }

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(2);

  return {
    state,
    eventCount: await page.locator("[data-s230-timeline-event]").count(),
    hasTimeline: (await page.locator("[data-s230-primary-timeline]").count()) === 1,
    hasNextReview: (await page.locator("[data-s230-next-review]").count()) === 1,
  };
}

async function tabToPrimaryAction(page: Page, testInfo: TestInfo) {
  const primaryAction = page.locator("[data-s230-dominant-next-action]");
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });

  let tabStops = 0;
  let reachedPrimaryAction = false;
  while (tabStops < 50 && !reachedPrimaryAction) {
    await page.keyboard.press("Tab");
    tabStops += 1;
    reachedPrimaryAction = await primaryAction.evaluate((element) => element === document.activeElement);
  }

  try {
    expect(reachedPrimaryAction, "The one dominant agenda action must be reachable with Tab.").toBe(true);
    await expect(primaryAction, "Tab must leave the dominant agenda action focused.").toBeFocused();
    await expect(
      primaryAction,
      "Chromium must finish scrolling the keyboard-focused agenda action into view.",
    ).toBeInViewport({ ratio: 0.8 });

    const focusState = await primaryAction.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        height: rect.height,
        focusVisible: element.matches(":focus-visible"),
        hasIndicator:
          (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0) ||
          (style.boxShadow !== "none" && style.boxShadow.length > 0),
      };
    });
    expect(focusState.height, "The primary agenda action must be at least 44px high.").toBeGreaterThanOrEqual(44);
    expect(focusState.focusVisible, "Keyboard focus must match :focus-visible.").toBe(true);
    expect(focusState.hasIndicator, "The focused agenda action must expose a visible indicator.").toBe(true);
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
          focusVisible: element.matches(":focus-visible"),
        };
      })
      .catch(() => null);
    const screenshot = "s230-focus-failure-390.png";
    const screenshots = await captureEvidence(page, testInfo, screenshot)
      .then((fileName) => [fileName])
      .catch(() => []);
    await writeFile(
      testInfo.outputPath("s230-runtime.json"),
      JSON.stringify(
        {
          result: "fail",
          stage: "keyboard-focus",
          runnerHeadSha: runtimeRunnerHeadSha,
          productDeploymentSha: runtimeProductSha,
          previewHost: expectedPreviewHost,
          viewport: "390x844",
          reachedPrimaryAction,
          tabStops,
          geometry,
          credentialsRedacted: true,
          traceCaptured: false,
          screenshots,
        },
        null,
        2,
      ),
      "utf8",
    );
    throw error;
  }
}

async function captureEvidence(page: Page, testInfo: TestInfo, fileName: string) {
  const path = testInfo.outputPath(fileName);
  await page.screenshot({
    path,
    fullPage: true,
    mask: [page.getByText(testEmail, { exact: false })],
  });
  return fileName;
}

test.describe("S230 PR-scoped authenticated Learning Record runtime", () => {
  test.describe.configure({ retries: 0, timeout: 300_000 });

  test("390/768/1440, focus, overflow, landmarks, and clean console", async ({ page }, testInfo) => {
    requireSafeRuntimeEnvironment();

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const sameOriginRequestFailures: string[] = [];
    const runtimeOrigin = new URL(runtimeBaseUrl).origin;
    const screenshots: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(sanitizeEvidence(message.text()));
    });
    page.on("pageerror", (error) => pageErrors.push(sanitizeEvidence(error.message)));
    page.on("requestfailed", (request) => {
      const url = new URL(request.url());
      const failure = request.failure()?.errorText ?? "unknown";
      if (url.origin !== runtimeOrigin || failure.includes("ERR_ABORTED")) return;
      sameOriginRequestFailures.push(sanitizeEvidence(request.method() + " " + url.pathname + " " + failure));
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await openExactHeadAgenda(page);
    const mobile = await expectAgendaLayout(page);
    const tabStopsToPrimaryAction = await tabToPrimaryAction(page, testInfo);
    screenshots.push(await captureEvidence(page, testInfo, "s230-agenda-390.png"));

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload({ waitUntil: "domcontentloaded" });
    const tablet = await expectAgendaLayout(page);
    screenshots.push(await captureEvidence(page, testInfo, "s230-agenda-768.png"));

    await page.setViewportSize({ width: 1440, height: 1024 });
    await page.reload({ waitUntil: "domcontentloaded" });
    const desktop = await expectAgendaLayout(page);
    screenshots.push(await captureEvidence(page, testInfo, "s230-agenda-1440.png"));

    const cleanRuntime =
      consoleErrors.length === 0 &&
      pageErrors.length === 0 &&
      sameOriginRequestFailures.length === 0;
    const manifest = {
      result: cleanRuntime ? "pass" : "fail",
      runnerHeadSha: runtimeRunnerHeadSha,
      productDeploymentSha: runtimeProductSha,
      previewHost: expectedPreviewHost,
      viewports: ["390x844", "768x1024", "1440x1024"],
      accountRouteState: mobile.state,
      timelineEventCount: mobile.eventCount,
      tabStopsToPrimaryAction,
      landmarks: {
        mobile: { timeline: mobile.hasTimeline, nextReview: mobile.hasNextReview },
        tablet: { timeline: tablet.hasTimeline, nextReview: tablet.hasNextReview },
        desktop: { timeline: desktop.hasTimeline, nextReview: desktop.hasNextReview },
      },
      horizontalOverflow: "pass",
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: pageErrors.length,
      sameOriginRequestFailureCount: sameOriginRequestFailures.length,
      screenshots,
    };
    await writeFile(testInfo.outputPath("s230-runtime.json"), JSON.stringify(manifest, null, 2), "utf8");

    expect(consoleErrors, "Browser console errors must be zero.").toEqual([]);
    expect(pageErrors, "Uncaught page errors must be zero.").toEqual([]);
    expect(sameOriginRequestFailures, "Unexpected same-origin request failures must be zero.").toEqual([]);
  });
});
