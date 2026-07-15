import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

import {
  establishProtectedPreviewSession,
  loginWithDedicatedTestAccount,
  monitorRuntimeErrors,
  requireSafeAuthenticatedRuntime,
  runtimeRunnerSha,
  runtimeTargetSha,
} from "./support/authenticated-runtime";

const runtimeEnabled = process.env.S232D3_AUTH_RUNTIME === "1";

const viewports = [
  { label: "390", width: 390, height: 844 },
  { label: "768", width: 768, height: 1024 },
  { label: "1440", width: 1440, height: 1024 },
] as const;

test.use({ screenshot: "off", trace: "off", video: "off" });
test.skip(!runtimeEnabled, "Set S232D3_AUTH_RUNTIME=1 for exact-head Notes list IA acceptance.");
test.describe.configure({ timeout: 300_000, retries: 0 });

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

async function expectVisibleKeyboardFocus(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });

  await page.keyboard.press("Tab");
  const skipLink = page.locator('a[href="#learner-main"]');
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#learner-main")).toBeFocused();

  let reached = false;
  for (let step = 0; step < 80; step += 1) {
    await page.keyboard.press("Tab");
    reached = await target.evaluate((element) => element === document.activeElement);
    if (reached) break;
  }
  expect(reached, "The first Note detail link must be reachable with real Tab navigation.").toBe(true);

  const focus = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineWidth: Number.parseFloat(style.outlineWidth) || 0,
      outlineStyle: style.outlineStyle,
      boxShadow: style.boxShadow,
    };
  });
  expect(
    (focus.outlineWidth > 0 && focus.outlineStyle !== "none") || focus.boxShadow !== "none",
    "The keyboard target must expose a visible focus indicator.",
  ).toBe(true);
}

test("S232D.3 exact-head Notes list preserves recent-first hierarchy without invented review state", async ({ page }, testInfo: TestInfo) => {
  requireSafeAuthenticatedRuntime("S232D.3", {
    requireTargetSha: true,
    requireExactHead: true,
  });
  await establishProtectedPreviewSession(page, "S232D.3");
  const runtimeErrors = monitorRuntimeErrors(page);
  const { signInAttempts } = await loginWithDedicatedTestAccount(page, "second");

  await page.goto("/app/notes?mode=second", { waitUntil: "domcontentloaded" });
  const observedBefore = await readObservedDeploymentSha(page);
  expect(observedBefore).toEqual({
    status: 200,
    ready: true,
    deploymentSha: runtimeTargetSha,
  });

  let recentCardCount = 0;
  let axeBlockingCount = 0;
  let unsupportedReviewStateCount = 0;
  let stateChipCount = 0;

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/app/notes?mode=second", { waitUntil: "domcontentloaded" });

    const root = page.locator('[data-s232d3-notes-list="recent-first"]');
    const cards = root.locator("[data-s232d3-note-card]");
    await expect(page.locator("main#learner-main")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(root).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1, name: "학습 노트", exact: true })).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "학습 메뉴" }).getByRole("link", { name: "학습 노트", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("교정 노트", { exact: false })).toHaveCount(0);

    const count = await cards.count();
    expect(count, "The dedicated invited account must expose at least one persisted Note.").toBeGreaterThan(0);
    expect(count, "The recent-first Notes list must render at most three primary cards.").toBeLessThanOrEqual(3);
    recentCardCount = Math.max(recentCardCount, count);

    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      await expect(card.locator("[data-s232d3-note-meta]")).toHaveCount(1);
      await expect(card.locator('[data-v3-component="BiggestGap"][data-v3-density="Compact"]')).toHaveCount(1);
      await expect(card.locator("[data-s232d3-next-action]")).toHaveCount(1);
      await expect(card.locator("[data-s232d3-detail-link]")).toHaveCount(1);
      await expect(card.locator("[data-s232d3-secondary-connections]")).toHaveCount(1);
      await expect(card.locator("[data-s232d3-detail-link]")).toHaveAttribute("href", /^\/app\/items\/[^?]+\?mode=second$/);
    }

    const hierarchy = await cards.evaluateAll((elements) =>
      elements.map((card) => {
        const meta = card.querySelector("[data-s232d3-note-meta]");
        const gap = card.querySelector('[data-v3-component="BiggestGap"]');
        const next = card.querySelector("[data-s232d3-next-action]");
        const detail = card.querySelector("[data-s232d3-detail-link]");
        const secondary = card.querySelector("[data-s232d3-secondary-connections]");
        if (!meta || !gap || !next || !detail || !secondary) return false;
        const follows = (before: Node, after: Node) =>
          Boolean(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING);
        return follows(meta, gap) && follows(gap, next) && follows(next, detail) && follows(detail, secondary);
      }),
    );
    expect(hierarchy).toEqual(Array.from({ length: count }, () => true));

    const unsafeCounts = {
      reviewState: await cards.getByText(/복습 예정/).count(),
      stateChip: await cards.locator('[data-v3-component="StateChip"]').count(),
    };
    expect(unsafeCounts.reviewState).toBe(0);
    expect(unsafeCounts.stateChip).toBe(0);
    unsupportedReviewStateCount += unsafeCounts.reviewState;
    stateChipCount += unsafeCounts.stateChip;

    const layout = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);

    await expectVisibleKeyboardFocus(page, cards.first().locator("[data-s232d3-detail-link]"));

    const axe = await new AxeBuilder({ page })
      .include("main#learner-main")
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

  const observedAfter = await readObservedDeploymentSha(page);
  expect(observedAfter).toEqual(observedBefore);
  expect(runtimeErrors.consoleErrors.length, "Console error count must be zero").toBe(0);
  expect(runtimeErrors.pageErrors.length, "Page error count must be zero").toBe(0);
  expect(runtimeErrors.sameOriginRequestFailures.length, "Same-origin request failure count must be zero").toBe(0);

  const evidence = {
    schemaVersion: 1,
    result: "pass",
    runnerSha: runtimeRunnerSha,
    targetDeploymentSha: runtimeTargetSha,
    observedDeploymentSha: observedAfter.deploymentSha,
    signInAttempts,
    viewportCount: viewports.length,
    recentCardCount,
    maxRecentCardsVerified: recentCardCount >= 1 && recentCardCount <= 3,
    cardHierarchyVerified: true,
    unsupportedReviewStateCount,
    stateChipCount,
    canonicalTerminologyVerified: true,
    keyboardFocusVerified: true,
    responsiveOverflowVerified: true,
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
  await writeFile(testInfo.outputPath("s232d3-runtime.json"), JSON.stringify(evidence, null, 2));
});
