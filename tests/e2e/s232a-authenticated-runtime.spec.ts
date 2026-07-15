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

const runtimeEnabled = process.env.S232A_AUTH_RUNTIME === "1";

const routes = [
  { label: "today", path: "/app?mode=second", ready: '[data-s224v-surface="/app"]' },
  { label: "items", path: "/app/items?mode=second", ready: '[data-s224v-surface="/app/items"]' },
  { label: "calculator", path: "/app/calculator?mode=second&focus=casio", ready: "[data-calculator-routine-v3]" },
] as const;

const viewports = [
  { label: "390", width: 390, height: 844, expectedPageEdge: "20px" },
  { label: "1440", width: 1440, height: 1024, expectedPageEdge: "32px" },
] as const;

test.use({ screenshot: "off", trace: "off", video: "off" });
test.skip(!runtimeEnabled, "Set S232A_AUTH_RUNTIME=1 for exact-head Figma V3 acceptance.");
test.describe.configure({ timeout: 300_000, retries: 0 });

async function foundationMetrics(page: Page) {
  return page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('16px "Noto Sans KR Variable"', "답안길"),
      document.fonts.load('17px "Noto Serif KR Variable"', "학습 근거"),
      document.fonts.load('13px "IBM Plex Mono"', "123.45"),
    ]);
    const root = getComputedStyle(document.documentElement);
    return {
      pageEdge: root.getPropertyValue("--layout-page-edge").trim(),
      contentMax: root.getPropertyValue("--layout-content-max").trim(),
      readingColumn: root.getPropertyValue("--layout-reading-column").trim(),
      evidenceRail: root.getPropertyValue("--layout-evidence-rail").trim(),
      fonts: {
        ui: document.fonts.check('16px "Noto Sans KR Variable"', "답안길"),
        prose: document.fonts.check('17px "Noto Serif KR Variable"', "학습 근거"),
        mono: document.fonts.check('13px "IBM Plex Mono"', "123.45"),
      },
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      theme: document.documentElement.dataset.theme,
    };
  });
}

test("S232A exact-head authenticated Figma V3 foundation contract", async ({ page }, testInfo: TestInfo) => {
  requireSafeAuthenticatedRuntime("S232A", { requireTargetSha: true, requireExactHead: true });
  const runtimeErrors = monitorRuntimeErrors(page);
  await establishProtectedPreviewSession(page, "S232A");
  const { signInAttempts } = await loginWithDedicatedTestAccount(page, "second");

  const observedVersion = await page.evaluate(async () => {
    const response = await fetch("/api/runtime/version", { cache: "no-store", credentials: "same-origin" });
    return { status: response.status, body: await response.json() as { ready?: boolean; deploymentSha?: string } };
  });
  expect(observedVersion.status).toBe(200);
  expect(observedVersion.body.ready).toBe(true);
  expect(observedVersion.body.deploymentSha).toBe(runtimeTargetSha);

  const routeEvidence: Array<Record<string, unknown>> = [];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const route of routes) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await expect(page.locator(route.ready)).toBeVisible({ timeout: 20_000 });
      await expect(page.locator("main:visible")).toHaveCount(1);
      await expect(page.locator("html")).toHaveAttribute("lang", "ko");
      const metrics = await foundationMetrics(page);
      expect(metrics).toMatchObject({
        pageEdge: viewport.expectedPageEdge,
        contentMax: "1120px",
        readingColumn: "680px",
        evidenceRail: "288px",
        fonts: { ui: true, prose: true, mono: true },
        theme: "light",
      });
      expect(metrics.horizontalOverflow).toBeLessThanOrEqual(1);
      routeEvidence.push({ route: route.label, viewport: viewport.label, ...metrics });
    }
  }

  await page.goto("/app/items?mode=second", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-s224v-surface="/app/items"]')).toBeVisible({ timeout: 20_000 });
  const detailLink = page.locator('a[href^="/app/items/"]').filter({ hasText: "노트 자세히 보기" }).first();
  const ledgerDetailAvailable = await detailLink.count() === 1;
  if (ledgerDetailAvailable) {
    await detailLink.click();
    await expect(page.locator("[data-s228-study-ledger-detail]")).toBeVisible({ timeout: 20_000 });
    const typeRoles = await page.evaluate(() => {
      const heading = document.querySelector<HTMLElement>('[data-v3-typography-role="heading-screen"]');
      const prose = document.querySelector<HTMLElement>('[data-v3-typography-role="prose"]');
      if (!heading || !prose) return null;
      return {
        headingFamily: getComputedStyle(heading).fontFamily,
        proseFamily: getComputedStyle(prose).fontFamily,
        proseSize: getComputedStyle(prose).fontSize,
        proseLine: getComputedStyle(prose).lineHeight,
      };
    });
    expect(typeRoles).not.toBeNull();
    expect(typeRoles?.headingFamily).toContain("Noto Sans KR Variable");
    expect(typeRoles?.proseFamily).toContain("Noto Serif KR Variable");
    expect(typeRoles).toMatchObject({ proseSize: "17px", proseLine: "30px" });
  }

  await page.goto("/app/calculator?mode=second&focus=casio", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-calculator-routine-v3]")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /루틴 시작/ }).click();
  const firstInput = page.locator('textarea[data-v3-typography-role="ui-body"]');
  await expect(firstInput).toBeVisible();
  await firstInput.fill("synthetic condition");
  await page.getByRole("button", { name: /다음/ }).click();
  const calculatorInput = page.locator('textarea[data-v3-typography-role="calculator-mono"]');
  await expect(calculatorInput).toBeVisible();
  const calculatorFont = await calculatorInput.evaluate((element) => getComputedStyle(element).fontFamily);
  expect(calculatorFont).toContain("IBM Plex Mono");

  expect(runtimeErrors).toEqual({ consoleErrors: [], pageErrors: [], sameOriginRequestFailures: [] });

  const evidence = {
    schemaVersion: 1,
    result: "pass",
    runnerSha: runtimeRunnerSha,
    targetDeploymentSha: runtimeTargetSha,
    observedDeploymentSha: observedVersion.body.deploymentSha,
    signInAttempts,
    routeEvidence,
    ledgerDetailAvailable,
    calculatorMonoRoleVerified: true,
    consoleErrorCount: runtimeErrors.consoleErrors.length,
    pageErrorCount: runtimeErrors.pageErrors.length,
    sameOriginRequestFailureCount: runtimeErrors.sameOriginRequestFailures.length,
    syntheticAccountOnly: true,
    credentialsRedacted: true,
    rawLearnerContentCaptured: false,
    screenshotCaptured: false,
    traceCaptured: false,
    videoCaptured: false,
  };
  expect(JSON.stringify(evidence)).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
  await writeFile(testInfo.outputPath("s232a-runtime.json"), JSON.stringify(evidence, null, 2));
});
