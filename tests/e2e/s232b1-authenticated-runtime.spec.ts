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

const runtimeEnabled = process.env.S232B1_AUTH_RUNTIME === "1";

const viewports = [
  { label: "390", width: 390, height: 844, expectedPageEdge: "20px" },
  { label: "1440", width: 1440, height: 1024, expectedPageEdge: "32px" },
] as const;

test.use({ screenshot: "off", trace: "off", video: "off" });
test.skip(!runtimeEnabled, "Set S232B1_AUTH_RUNTIME=1 for exact-head TrustEvidenceBar acceptance.");
test.describe.configure({ timeout: 300_000, retries: 0 });

async function findEvidenceBackedStudyLedgerDetail(page: Page) {
  await page.goto("/app/items?mode=second", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-s224v-surface="/app/items"]')).toBeVisible({ timeout: 20_000 });
  const detailHrefs = await page
    .locator('a[href^="/app/items/"]')
    .filter({ hasText: "노트 자세히 보기" })
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")).filter(Boolean) as string[],
    );

  expect(
    detailHrefs.length,
    "An invited-account Study Ledger detail is required for S232B.1 acceptance.",
  ).toBeGreaterThan(0);

  for (const href of detailHrefs.slice(0, 12)) {
    await page.goto(href, { waitUntil: "domcontentloaded" });
    const detail = page.locator("[data-s228-study-ledger-detail]");
    await expect(detail).toBeVisible({ timeout: 20_000 });
    if (await detail.locator('[data-v3-component="TrustEvidenceBar"][data-v3-state]').count()) {
      return detail;
    }
  }

  throw new Error(
    "S232B.1 requires a persisted detail with explicit confirmation, review, or conflict evidence; neutral data is not promoted.",
  );
}

test("S232B.1 exact-head Study Ledger trust bar placement and disclosure", async ({ page }, testInfo: TestInfo) => {
  requireSafeAuthenticatedRuntime("S232B.1", {
    requireTargetSha: true,
    requireExactHead: true,
  });
  const runtimeErrors = monitorRuntimeErrors(page);
  await establishProtectedPreviewSession(page, "S232B.1");
  const { signInAttempts } = await loginWithDedicatedTestAccount(page, "second");

  const observedVersion = await page.evaluate(async () => {
    const response = await fetch("/api/runtime/version", {
      cache: "no-store",
      credentials: "same-origin",
    });
    return {
      status: response.status,
      body: (await response.json()) as { ready?: boolean; deploymentSha?: string },
    };
  });
  expect(observedVersion.status).toBe(200);
  expect(observedVersion.body.ready).toBe(true);
  expect(observedVersion.body.deploymentSha).toBe(runtimeTargetSha);

  const viewportEvidence: Array<Record<string, unknown>> = [];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const detail = await findEvidenceBackedStudyLedgerDetail(page);
    const readingColumn = detail.locator("[data-s232b1-reading-column]");
    const bar = detail.locator('[data-v3-component="TrustEvidenceBar"]');
    const rail = detail.locator("[data-s228-evidence-rail]");
    const button = bar.getByRole("button");

    await expect(bar).toHaveCount(1);
    await expect(readingColumn.locator('[data-v3-component="TrustEvidenceBar"]')).toHaveCount(1);
    await expect(rail.locator('[data-v3-component="TrustEvidenceBar"]')).toHaveCount(0);
    await expect(bar).toHaveAttribute("data-v3-state", /Verified|NeedsReview|Conflict/);
    await expect(bar.locator("[data-v3-trust-status]")).toBeVisible();
    await expect(bar).toHaveAttribute("data-v3-view", "Collapsed");
    await expect(button).toHaveAttribute("aria-expanded", "false");

    const collapsedBox = await bar.boundingBox();
    const buttonBox = await button.boundingBox();
    expect(collapsedBox?.height ?? 0).toBeGreaterThanOrEqual(72);
    expect(buttonBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(buttonBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await button.focus();
    await page.keyboard.press("Enter");
    await expect(bar).toHaveAttribute("data-v3-view", "Expanded");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(bar.locator("[data-v3-trust-details]")).toBeVisible();
    expect((await bar.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(170);
    await page.keyboard.press("Space");
    await expect(bar).toHaveAttribute("data-v3-view", "Collapsed");
    await expect(button).toHaveAttribute("aria-expanded", "false");

    const metrics = await page.evaluate(() => {
      const detailElement = document.querySelector<HTMLElement>("[data-s228-study-ledger-detail]");
      const reading = detailElement?.querySelector<HTMLElement>("[data-s232b1-reading-column]");
      const trust = detailElement?.querySelector<HTMLElement>('[data-v3-component="TrustEvidenceBar"]');
      const biggestGap = detailElement?.querySelector<HTMLElement>('[data-v3-component="BiggestGap"]');
      const controlledId = trust?.querySelector<HTMLButtonElement>("button")?.getAttribute("aria-controls");
      if (!detailElement || !reading || !trust || !biggestGap || !controlledId) return null;
      return {
        pageEdge: getComputedStyle(document.documentElement)
          .getPropertyValue("--layout-page-edge")
          .trim(),
        horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        componentCount: detailElement.querySelectorAll('[data-v3-component="TrustEvidenceBar"]').length,
        readingCount: reading.querySelectorAll('[data-v3-component="TrustEvidenceBar"]').length,
        railCount: detailElement.querySelectorAll(
          '[data-s228-evidence-rail] [data-v3-component="TrustEvidenceBar"]',
        ).length,
        correctOrder: Boolean(
          trust.compareDocumentPosition(biggestGap) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        readingWidth: reading.getBoundingClientRect().width,
        leftEdge: trust.getBoundingClientRect().left,
        controlsResolve: Boolean(trust.querySelector(`#${CSS.escape(controlledId)}`)),
      };
    });
    expect(metrics).not.toBeNull();
    expect(metrics?.pageEdge).toBe(viewport.expectedPageEdge);
    expect(metrics?.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(metrics).toMatchObject({
      componentCount: 1,
      readingCount: 1,
      railCount: 0,
      correctOrder: true,
      controlsResolve: true,
    });
    if (viewport.width === 390) expect(metrics?.leftEdge).toBeCloseTo(20, 0);
    if (viewport.width === 1440) expect(metrics?.readingWidth).toBeCloseTo(680, 0);

    const axe = await new AxeBuilder({ page })
      .include("[data-s228-study-ledger-detail]")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const blockingAxe = axe.violations
      .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodeCount: violation.nodes.length,
      }));
    expect(blockingAxe).toEqual([]);

    viewportEvidence.push({
      viewport: viewport.label,
      componentCount: metrics?.componentCount,
      readingCount: metrics?.readingCount,
      railCount: metrics?.railCount,
      correctOrder: metrics?.correctOrder,
      horizontalOverflow: metrics?.horizontalOverflow,
      collapsedHeightValid: true,
      expandedHeightValid: true,
      targetSizeValid: true,
      enterToggleValid: true,
      spaceToggleValid: true,
      controlsResolve: metrics?.controlsResolve,
      axeBlockingCount: blockingAxe.length,
      evidenceBackedStatePresent: true,
    });
  }

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
    observedDeploymentSha: observedVersion.body.deploymentSha,
    signInAttempts,
    persistedDetailAvailable: true,
    viewportEvidence,
    consoleErrorCount: runtimeErrors.consoleErrors.length,
    pageErrorCount: runtimeErrors.pageErrors.length,
    sameOriginRequestFailureCount: runtimeErrors.sameOriginRequestFailures.length,
    credentialsRedacted: true,
    rawLearnerContentCaptured: false,
    screenshotCaptured: false,
    traceCaptured: false,
    videoCaptured: false,
  };
  expect(JSON.stringify(evidence)).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
  await writeFile(testInfo.outputPath("s232b1-runtime.json"), JSON.stringify(evidence, null, 2));
});
