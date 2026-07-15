import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

import {
  captureSanitizedScreenshot,
  loginWithDedicatedTestAccount,
  monitorRuntimeErrors,
  protectionHeaders,
  requireSafeAuthenticatedRuntime,
  runtimeRunnerSha,
  runtimeTargetSha,
} from "./support/authenticated-runtime";

const runtimeEnabled = process.env.S231A_AUTH_RUNTIME === "1";

const viewports = [
  { label: "390", width: 390, height: 844 },
  { label: "768", width: 768, height: 1024 },
  { label: "1440", width: 1440, height: 1024 },
] as const;

const mobileLabels = ["오늘", "답안", "학습 노트", "복습", "기록"] as const;
const desktopLabels = ["오늘 할 일", "오늘 한 것", "학습 노트", "복습", "학습 기록"] as const;
const navigationPaths = ["/app", "/app/capture", "/app/notes", "/app/review", "/app/agenda"] as const;

test.use({
  extraHTTPHeaders: protectionHeaders,
  screenshot: "off",
  trace: "off",
  video: "off",
});

test.skip(
  !runtimeEnabled,
  "Set S231A_AUTH_RUNTIME=1 for the exact-head learner-shell accessibility acceptance.",
);

// One authenticated session deliberately exercises three viewport widths,
// keyboard traversal, route transitions, and privacy-safe full-page captures.
// Keep that complete acceptance story in one test without inheriting the
// 60-second smoke-test budget.
test.describe.configure({ timeout: 180_000, retries: 0 });

type FocusStop = {
  href: string | null;
  label: string;
  inLearnerNavigation: boolean;
  outlineWidth: number;
  outlineStyle: string;
};

async function resetKeyboardStart(page: Page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
}

async function currentFocusStop(page: Page): Promise<FocusStop> {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) {
      return {
        href: null,
        label: "",
        inLearnerNavigation: false,
        outlineWidth: 0,
        outlineStyle: "none",
      };
    }
    const style = getComputedStyle(active);
    return {
      href: active.getAttribute("href"),
      label: active.getAttribute("aria-label") ?? active.innerText.trim(),
      inLearnerNavigation: Boolean(active.closest('nav[aria-label="학습 메뉴"]')),
      outlineWidth: Number.parseFloat(style.outlineWidth) || 0,
      outlineStyle: style.outlineStyle,
    };
  });
}

async function verifySkipLink(page: Page) {
  await resetKeyboardStart(page);
  await page.keyboard.press("Tab");
  const skipLink = page.locator('a[href="#learner-main"]');
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  const focusStyle = await currentFocusStop(page);
  expect(focusStyle.href).toBe("#learner-main");
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(focusStyle.outlineStyle).not.toBe("none");

  await page.keyboard.press("Enter");
  await expect(page.locator("main#learner-main")).toBeFocused();
}

async function verifyLearnerNavigationTabOrder(page: Page) {
  await page.goto("/app?mode=second", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-learner-shell]")).toBeVisible();
  await resetKeyboardStart(page);

  const navigationStops: FocusStop[] = [];
  let firstStop: FocusStop | null = null;
  for (let index = 0; index < 20 && navigationStops.length < navigationPaths.length; index += 1) {
    await page.keyboard.press("Tab");
    const stop = await currentFocusStop(page);
    firstStop ??= stop;
    if (stop.inLearnerNavigation) navigationStops.push(stop);
  }

  expect(firstStop?.href).toBe("#learner-main");
  expect(navigationStops).toHaveLength(navigationPaths.length);
  expect(
    navigationStops.map((stop) => new URL(stop.href ?? "", page.url()).pathname),
  ).toEqual(navigationPaths);
  for (const stop of navigationStops) {
    expect(stop.outlineWidth).toBeGreaterThanOrEqual(2);
    expect(stop.outlineStyle).not.toBe("none");
  }

  return navigationStops.length + 1;
}

async function visibleTargetFailures(page: Page) {
  return page.locator("[data-learner-shell] header").locator(
    'a, button, summary, input, select, textarea, [role="button"]',
  ).evaluateAll((elements) =>
    elements.flatMap((element) => {
      if (!(element instanceof HTMLElement)) return [];
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (
        rect.width === 0 ||
        rect.height === 0 ||
        style.display === "none" ||
        style.visibility === "hidden"
      ) {
        return [];
      }
      if (rect.width >= 44 && rect.height >= 44) return [];
      return [{
        tag: element.tagName.toLowerCase(),
        label: element.getAttribute("aria-label") ?? element.innerText.trim(),
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
      }];
    }),
  );
}

async function captureShell(
  page: Page,
  testInfo: TestInfo,
  label: string,
) {
  const fileName = `s231a-shell-${label}.png`;
  await captureSanitizedScreenshot(page, testInfo, fileName);
  return fileName;
}

test("S231A learner shell stays accessible at 390/768/1440", async ({ page }, testInfo) => {
  requireSafeAuthenticatedRuntime("S231A", {
    requireTargetSha: true,
    requireExactHead: true,
  });

  const { signInAttempts } = await loginWithDedicatedTestAccount(page, "second");
  const runtimeErrors = monitorRuntimeErrors(page);
  const viewportEvidence: Array<Record<string, unknown>> = [];
  const screenshots: string[] = [];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/app?mode=second", { waitUntil: "domcontentloaded" });

    const shell = page.locator("[data-learner-shell]");
    const learnerNavigation = page.getByRole("navigation", { name: "학습 메뉴" });
    await expect(shell).toBeVisible();
    await expect(page.locator("main#learner-main")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(learnerNavigation.getByRole("link")).toHaveCount(5);

    const expectedLabels = viewport.width < 640 ? mobileLabels : desktopLabels;
    for (const label of expectedLabels) {
      await expect(learnerNavigation.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    await expect(learnerNavigation.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(
      learnerNavigation.getByRole("link", { name: expectedLabels[0], exact: true }),
    ).toHaveAttribute("aria-current", "page");

    const undersizedTargets = await visibleTargetFailures(page);
    expect(undersizedTargets).toEqual([]);

    const layout = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);

    const shellBottomPadding = await shell.locator(":scope > div").evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).paddingBottom),
    );
    expect(shellBottomPadding).toBeGreaterThanOrEqual(viewport.width < 1024 ? 96 : 48);

    await verifySkipLink(page);
    const keyboardStops = await verifyLearnerNavigationTabOrder(page);

    await page.goto("/app/notes?mode=second", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("navigation", { name: "학습 메뉴" }).locator('[aria-current="page"]'),
    ).toHaveAttribute("href", /\/app\/notes\?mode=second$/);

    await page.goto("/app?mode=second", { waitUntil: "domcontentloaded" });
    screenshots.push(await captureShell(page, testInfo, viewport.label));
    viewportEvidence.push({
      viewport: `${viewport.width}x${viewport.height}`,
      accessibleLabels: expectedLabels,
      undersizedTargetCount: undersizedTargets.length,
      horizontalOverflow: Math.max(0, layout.scrollWidth - layout.innerWidth),
      shellBottomPadding,
      keyboardStops,
      skipLinkTransferredFocus: true,
      currentRouteSemantics: true,
    });
  }

  expect(runtimeErrors.consoleErrors).toEqual([]);
  expect(runtimeErrors.pageErrors).toEqual([]);
  expect(runtimeErrors.sameOriginRequestFailures).toEqual([]);

  const manifest = {
    schemaVersion: 1,
    result: "pass",
    runnerSha: runtimeRunnerSha,
    targetDeploymentSha: runtimeTargetSha,
    signInAttempts,
    viewportEvidence,
    screenshotCount: screenshots.length,
    screenshots,
    consoleErrorCount: runtimeErrors.consoleErrors.length,
    pageErrorCount: runtimeErrors.pageErrors.length,
    sameOriginRequestFailureCount: runtimeErrors.sameOriginRequestFailures.length,
    browserAccessibilityTreeProxy: true,
    manualScreenReaderCertification: false,
    syntheticAccountOnly: true,
    credentialsRedacted: true,
    traceCaptured: false,
    videoCaptured: false,
  };

  await writeFile(testInfo.outputPath("s231a-runtime.json"), JSON.stringify(manifest, null, 2));
});
