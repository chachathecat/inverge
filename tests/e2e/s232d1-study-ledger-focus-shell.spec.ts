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

const runtimeEnabled = process.env.S232D1_AUTH_RUNTIME === "1";

const viewports = [
  { label: "390", width: 390, height: 844, chromeHeight: 56, mobile: true },
  { label: "768", width: 768, height: 1024, chromeHeight: 56, mobile: true },
  { label: "1440", width: 1440, height: 1024, chromeHeight: 72, mobile: false },
] as const;

test.use({ screenshot: "off", trace: "off", video: "off" });
test.skip(!runtimeEnabled, "Set S232D1_AUTH_RUNTIME=1 for exact-head Ledger focus-shell acceptance.");
test.describe.configure({ timeout: 300_000, retries: 0 });

async function enterVisibleStudyLedgerDetail(page: Page, navigateToNotes = true) {
  if (navigateToNotes) {
    await page.goto("/app/notes?mode=second", { waitUntil: "domcontentloaded" });
  }
  const links = page.locator('a[href^="/app/items/"]');
  const linkCount = await links.count();
  for (let index = 0; index < linkCount; index += 1) {
    const link = links.nth(index);
    if (!(await link.isVisible())) continue;
    const href = await link.getAttribute("href");
    if (!href) continue;
    await Promise.all([
      page.waitForURL(
        (url) => url.pathname.startsWith("/app/items/") && url.searchParams.get("mode") === "second",
      ),
      link.click(),
    ]);
    return href;
  }
  throw new Error("An invited-account Study Ledger detail is required for S232D.1.");
}

async function readObservedDeploymentSha(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/runtime/version", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const body = (await response.json()) as { ready?: boolean; deploymentSha?: string };
    return { status: response.status, ready: body.ready, deploymentSha: body.deploymentSha };
  });
}

async function verifyFocusEntry(page: Page, expectedAccessibleName: string) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await page.keyboard.press("Tab");
  const skipLink = page.locator('a[href="#study-ledger-content"]');
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Tab");
  const active = page.locator("*:focus");
  await expect(active).toHaveAccessibleName(expectedAccessibleName);
  const focus = await active.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineWidth: Number.parseFloat(style.outlineWidth) || 0,
      outlineStyle: style.outlineStyle,
      boxShadow: style.boxShadow,
    };
  });
  const hasOutline = focus.outlineWidth >= 2 && focus.outlineStyle !== "none";
  const hasFocusRing = focus.boxShadow !== "none";
  expect(hasOutline || hasFocusRing).toBe(true);
  await page.keyboard.press("Shift+Tab");
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#study-ledger-content")).toBeFocused();
}

test("S232D.1 exact-head Ledger uses the V3 focus chrome", async ({ page }, testInfo: TestInfo) => {
  requireSafeAuthenticatedRuntime("S232D.1", {
    requireTargetSha: true,
    requireExactHead: true,
  });
  const runtimeErrors = monitorRuntimeErrors(page);
  await establishProtectedPreviewSession(page, "S232D.1");
  const { signInAttempts } = await loginWithDedicatedTestAccount(page, "second");
  await page.setViewportSize({ width: 390, height: 844 });
  const detailHref = await enterVisibleStudyLedgerDetail(page);
  await expect(page.locator('[data-learner-shell-mode="focus"]')).toBeVisible();

  const mobileBack = page.getByRole("link", { name: "학습 노트로 돌아가기" });
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/app/notes" && url.searchParams.get("mode") === "second"),
    mobileBack.click(),
  ]);
  await expect(page.locator('[data-learner-shell-mode="default"]')).toBeVisible();
  await expect(page.getByRole("navigation", { name: "학습 메뉴" }).getByRole("link")).toHaveCount(5);
  expect(await enterVisibleStudyLedgerDetail(page, false)).toBe(detailHref);
  await expect(page.locator('[data-learner-shell-mode="focus"]')).toBeVisible();

  const observedVersion = await readObservedDeploymentSha(page);
  expect(observedVersion).toEqual({
    status: 200,
    ready: true,
    deploymentSha: runtimeTargetSha,
  });

  let axeBlockingCount = 0;
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(detailHref, { waitUntil: "domcontentloaded" });

    const focusShell = page.locator('[data-learner-shell-mode="focus"]');
    const chrome = page.locator("[data-s232d1-ledger-chrome]");
    const detail = page.locator("[data-s228-study-ledger-detail]");
    await expect(focusShell).toBeVisible();
    await expect(page.locator("main#learner-main")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "학습 메뉴" })).toHaveCount(0);
    await expect(chrome).toHaveCount(1);
    await expect(detail).toHaveCount(1);
    await expect(detail.locator('[data-v3-component="TrustEvidenceBar"]')).toHaveCount(1);
    await expect(detail.locator('[data-v3-component="BiggestGap"]')).toHaveCount(1);
    await expect(detail.locator('[data-v3-component="StickyAction"]')).toHaveCount(1);

    const chromeBox = await chrome.boundingBox();
    expect(chromeBox?.height ?? 0).toBeCloseTo(viewport.chromeHeight, 0);
    const workspaceTracks = await detail.locator("[data-s232d1-ledger-workspace]").evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).filter(Boolean),
    );
    if (viewport.mobile) {
      const back = page.getByRole("link", { name: "학습 노트로 돌아가기" });
      await expect(back).toBeVisible();
      await expect(chrome.getByText("학습 노트", { exact: true })).toBeVisible();
      await expect(chrome.getByRole("status")).toHaveText("저장됨");
      const backBox = await back.boundingBox();
      expect(backBox?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(backBox?.height ?? 0).toBeGreaterThanOrEqual(44);
      const mobileLayout = await chrome.locator("[data-s232d1-mobile-chrome]").evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          firstTrack: Number.parseFloat(style.gridTemplateColumns),
          paddingLeft: Number.parseFloat(style.paddingLeft),
        };
      });
      expect(mobileLayout.firstTrack).toBeCloseTo(44, 0);
      expect(mobileLayout.paddingLeft).toBeCloseTo(4, 0);
      expect(workspaceTracks).toHaveLength(1);
      await verifyFocusEntry(page, "학습 노트로 돌아가기");
    } else {
      await expect(page.getByRole("link", { name: "답안길 오늘 할 일로 이동" })).toBeVisible();
      await expect(chrome.getByText("by Inverge", { exact: true })).toBeVisible();
      await expect(chrome.getByText(/^학습 노트 \/ /)).toBeVisible();
      await expect(chrome.getByRole("status")).toContainText("저장됨 · ");
      const desktopLayout = await chrome.locator("[data-s232d1-desktop-chrome]").evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          columnGap: Number.parseFloat(style.columnGap),
          paddingLeft: Number.parseFloat(style.paddingLeft),
        };
      });
      const breadcrumbLayout = await chrome.locator("[data-s232d1-ledger-breadcrumb]").evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          overflowX: style.overflowX,
          textOverflow: style.textOverflow,
          whiteSpace: style.whiteSpace,
        };
      });
      expect(desktopLayout.columnGap).toBeCloseTo(24, 0);
      expect(desktopLayout.paddingLeft).toBeCloseTo(64, 0);
      expect(workspaceTracks).toHaveLength(2);
      expect(Number.parseFloat(workspaceTracks[0]!)).toBeCloseTo(680, 0);
      expect(Number.parseFloat(workspaceTracks[1]!)).toBeCloseTo(288, 0);
      expect(breadcrumbLayout).toEqual({ overflowX: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });
      await verifyFocusEntry(page, "답안길 오늘 할 일로 이동");
    }

    const metrics = await page.evaluate(() => ({
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      focusShellCount: document.querySelectorAll('[data-learner-shell-mode="focus"]').length,
      chromeCount: document.querySelectorAll("[data-s232d1-ledger-chrome]").length,
      detailCount: document.querySelectorAll("[data-s228-study-ledger-detail]").length,
    }));
    expect(metrics).toMatchObject({ focusShellCount: 1, chromeCount: 1, detailCount: 1 });
    expect(metrics.horizontalOverflow).toBeLessThanOrEqual(1);

    const axe = await new AxeBuilder({ page })
      .include('[data-learner-shell-mode="focus"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const blockingAxe = axe.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    axeBlockingCount += blockingAxe.length;
    const blockingRuleIds = [...new Set(blockingAxe.map((violation) => violation.id))].sort();
    expect(
      blockingAxe.length,
      `Axe blocking rule count must be zero; ids=${blockingRuleIds.join(",") || "none"}`,
    ).toBe(0);
  }

  await Promise.all([
    page.waitForURL((url) => url.pathname === "/app" && url.searchParams.get("mode") === "second"),
    page.getByRole("link", { name: "답안길 오늘 할 일로 이동" }).click(),
  ]);
  await expect(page.locator('[data-learner-shell-mode="default"]')).toBeVisible();
  await expect(page.getByRole("navigation", { name: "학습 메뉴" }).getByRole("link")).toHaveCount(5);

  expect(runtimeErrors.consoleErrors.length, "Console error count must be zero").toBe(0);
  expect(runtimeErrors.pageErrors.length, "Page error count must be zero").toBe(0);
  expect(runtimeErrors.sameOriginRequestFailures.length, "Same-origin request failure count must be zero").toBe(0);

  const evidence = {
    schemaVersion: 1,
    result: "pass",
    runnerSha: runtimeRunnerSha,
    targetDeploymentSha: runtimeTargetSha,
    observedDeploymentSha: observedVersion.deploymentSha,
    signInAttempts,
    viewportCount: viewports.length,
    mobileChromeCount: viewports.filter((viewport) => viewport.mobile).length,
    desktopChromeCount: viewports.filter((viewport) => !viewport.mobile).length,
    focusShellVerified: true,
    defaultShellPreserved: true,
    clientNavigationVerified: true,
    skipLinkVerified: true,
    minimumTargetSizeVerified: true,
    responsiveGeometryVerified: true,
    detailPrimitiveCountVerified: true,
    axeBlockingCount,
    consoleErrorCount: runtimeErrors.consoleErrors.length,
    pageErrorCount: runtimeErrors.pageErrors.length,
    sameOriginRequestFailureCount: runtimeErrors.sameOriginRequestFailures.length,
    credentialsCaptured: false,
    rawLearnerContentCaptured: false,
    domCaptured: false,
    screenshotCaptured: false,
    traceCaptured: false,
    videoCaptured: false,
  };
  expect(JSON.stringify(evidence)).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
  await writeFile(testInfo.outputPath("s232d1-runtime.json"), JSON.stringify(evidence, null, 2));
});
