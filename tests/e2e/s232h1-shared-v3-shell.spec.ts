import AxeBuilder from "@axe-core/playwright";
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

const runtimeEnabled = process.env.S232H1_AUTH_RUNTIME === "1";
const viewports = [
  { label: "390", width: 390, height: 844 },
  { label: "768", width: 768, height: 1024 },
  { label: "1440", width: 1440, height: 1024 },
] as const;
const mobileLabels = ["오늘", "답안", "학습 노트", "복습", "기록"] as const;
const desktopLabels = ["오늘 할 일", "오늘 한 것", "학습 노트", "복습", "학습 기록"] as const;

test.use({
  extraHTTPHeaders: protectionHeaders,
  screenshot: "off",
  trace: "off",
  video: "off",
});

test.skip(!runtimeEnabled, "Set S232H1_AUTH_RUNTIME=1 for exact-head V3 shell acceptance.");
test.describe.configure({ timeout: 180_000, retries: 0 });

async function visibleTargetFailures(page: Page, rootSelector: string) {
  return page.locator(rootSelector).locator(
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
      ) return [];
      if (rect.width >= 44 && rect.height >= 44) return [];
      return [{
        label: element.getAttribute("aria-label") ?? element.innerText.trim(),
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
      }];
    }),
  );
}

async function verifySkipLink(page: Page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await page.keyboard.press("Tab");
  const skipLink = page.locator('a[href="#learner-main"]');
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  const visibleFocus = await skipLink.evaluate((element) => {
    const style = getComputedStyle(element);
    return style.outlineStyle !== "none" || style.boxShadow !== "none";
  });
  expect(visibleFocus).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.locator("main#learner-main")).toBeFocused();
}

async function captureShell(page: Page, testInfo: TestInfo, label: string) {
  const fileName = `s232h1-shell-${label}.png`;
  await captureSanitizedScreenshot(page, testInfo, fileName);
  return fileName;
}

test("S232H.1 shared V3 shell is accessible at 390/768/1440", async ({ page }, testInfo) => {
  requireSafeAuthenticatedRuntime("S232H.1", {
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

    const shell = page.locator('[data-learner-shell-mode="default"]');
    const navigation = page.getByRole("navigation", { name: "학습 메뉴" });
    await expect(shell).toBeVisible();
    await expect(page.locator("main#learner-main")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(navigation.getByRole("link")).toHaveCount(5);

    const expectedLabels = viewport.width < 768 ? mobileLabels : desktopLabels;
    for (const label of expectedLabels) {
      await expect(navigation.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);

    const targets = await visibleTargetFailures(page, '[data-learner-shell] header');
    expect(targets).toEqual([]);

    const layout = await shell.evaluate((element) => {
      const content = element.firstElementChild;
      if (!(content instanceof HTMLElement)) throw new Error("Missing shell content wrapper");
      const contentStyle = getComputedStyle(content);
      return {
        innerWidth: window.innerWidth,
        pageScrollWidth: document.documentElement.scrollWidth,
        pageEdge: Number.parseFloat(contentStyle.paddingLeft),
        bottomPadding: Number.parseFloat(contentStyle.paddingBottom),
      };
    });
    expect(layout.pageScrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
    expect(layout.pageEdge).toBeGreaterThanOrEqual(viewport.width < 768 ? 20 : 32);
    expect(layout.bottomPadding).toBeGreaterThanOrEqual(viewport.width < 1024 ? 32 : 48);

    await verifySkipLink(page);

    const axe = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = axe.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(seriousOrCritical).toEqual([]);

    screenshots.push(await captureShell(page, testInfo, viewport.label));

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-v3-shell="public"]')).toBeVisible();
    await expect(page.locator('[data-v3-shell="public-header"]')).toBeVisible();
    await expect(page.locator("main")).toHaveCount(1);

    const publicTargets = await visibleTargetFailures(page, '[data-v3-shell="public-header"]');
    expect(publicTargets).toEqual([]);
    const publicLayout = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
    }));
    expect(publicLayout.pageScrollWidth).toBeLessThanOrEqual(publicLayout.innerWidth + 1);

    const publicAxe = await new AxeBuilder({ page }).analyze();
    const publicSeriousOrCritical = publicAxe.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(publicSeriousOrCritical).toEqual([]);

    viewportEvidence.push({
      viewport: `${viewport.width}x${viewport.height}`,
      horizontalOverflow: Math.max(0, layout.pageScrollWidth - layout.innerWidth),
      pageEdge: layout.pageEdge,
      bottomPadding: layout.bottomPadding,
      undersizedHeaderTargetCount: targets.length,
      axeSeriousOrCritical: seriousOrCritical.length,
      keyboardFocusVisible: true,
      publicHorizontalOverflow: Math.max(
        0,
        publicLayout.pageScrollWidth - publicLayout.innerWidth,
      ),
      publicUndersizedHeaderTargetCount: publicTargets.length,
      publicAxeSeriousOrCritical: publicSeriousOrCritical.length,
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
    syntheticAccountOnly: true,
    credentialsRedacted: true,
    rawLearnerContentCaptured: false,
    traceCaptured: false,
    videoCaptured: false,
  };
  await writeFile(testInfo.outputPath("s232h1-runtime.json"), JSON.stringify(manifest, null, 2));
});
