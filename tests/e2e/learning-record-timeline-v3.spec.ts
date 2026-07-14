import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const expectedPreviewUrl = "https://inverge-git-agent-s230-learning-r-546b4c-chachathecats-projects.vercel.app";
const expectedPreviewHost = new URL(expectedPreviewUrl).hostname;
const runtimeEnabled = process.env.S230_AUTH_RUNTIME === "1";
const runtimeBaseUrl = process.env.E2E_BASE_URL?.trim() ?? "";
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
    page.waitForResponse((candidate) => {
      const url = new URL(candidate.url());
      return candidate.request().method() === "POST" && url.pathname === "/api/auth/sign-in";
    }),
    page.getByTestId("login-submit").click(),
  ]);

  expect(response.ok(), "The dedicated invited account must sign in through the app endpoint.").toBe(true);
  await expect(page).toHaveURL((url) => url.pathname === "/app");
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

async function tabToPrimaryAction(page: Page) {
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

  expect(reachedPrimaryAction, "The one dominant agenda action must be reachable with Tab.").toBe(true);
  const focusState = await primaryAction.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
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
  expect(focusState.visible, "The focused agenda action must remain visible.").toBe(true);
  expect(focusState.hasIndicator, "The focused agenda action must expose a visible indicator.").toBe(true);
  return tabStops;
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
  test.describe.configure({ timeout: 300_000 });

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
    const tabStopsToPrimaryAction = await tabToPrimaryAction(page);
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
