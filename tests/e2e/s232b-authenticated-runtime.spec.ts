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

const runtimeEnabled = process.env.S232B_AUTH_RUNTIME === "1";

const viewports = [
  { label: "390", width: 390, height: 844, expectedPageEdge: "20px" },
  { label: "768", width: 768, height: 1024, expectedPageEdge: "32px" },
  { label: "1440", width: 1440, height: 1024, expectedPageEdge: "32px" },
] as const;

test.use({ screenshot: "off", trace: "off", video: "off" });
test.skip(!runtimeEnabled, "Set S232B_AUTH_RUNTIME=1 for exact-head passive component acceptance.");
test.describe.configure({ timeout: 300_000, retries: 0 });

async function findPersistedDetailWithPassiveComponents(page: Page) {
  await page.goto("/app/items?mode=second", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-s224v-surface="/app/items"]')).toBeVisible({ timeout: 20_000 });
  const detailHrefs = await page
    .locator('a[href^="/app/items/"]')
    .filter({ hasText: "노트 자세히 보기" })
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")).filter(Boolean) as string[]);

  expect(detailHrefs.length, "A persisted Study Ledger detail is required for S232B acceptance.").toBeGreaterThan(0);
  for (const href of detailHrefs.slice(0, 12)) {
    await page.goto(href, { waitUntil: "domcontentloaded" });
    const detail = page.locator("[data-s228-study-ledger-detail]");
    await expect(detail).toBeVisible({ timeout: 20_000 });
    if (await detail.locator('[data-v3-component="EvidenceExcerpt"]').count()) return detail;
  }

  throw new Error("A persisted detail with typed learner evidence is required for S232B acceptance.");
}

async function passiveComponentMetrics(page: Page) {
  return page.evaluate(() => {
    const chip = document.querySelector<HTMLElement>('[data-v3-component="StateChip"]');
    const gap = document.querySelector<HTMLElement>('[data-v3-component="BiggestGap"]');
    const excerpt = document.querySelector<HTMLElement>('[data-v3-component="EvidenceExcerpt"]');
    const gapMark = gap?.querySelector<HTMLElement>(":scope > span[aria-hidden='true']");
    const prose = excerpt?.querySelector<HTMLElement>("blockquote");
    if (!chip || !gap || !excerpt || !gapMark || !prose) return null;

    const rootStyle = getComputedStyle(document.documentElement);
    const gapStyle = getComputedStyle(gap);
    const gapMarkStyle = getComputedStyle(gapMark);
    const excerptStyle = getComputedStyle(excerpt);
    const proseStyle = getComputedStyle(prose);
    return {
      pageEdge: rootStyle.getPropertyValue("--layout-page-edge").trim(),
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      state: chip.dataset.v3State,
      legacyState: chip.dataset.s228StateChip,
      chipHeight: chip.getBoundingClientRect().height,
      gapType: gap.dataset.v3Type,
      gapDensity: gap.dataset.v3Density,
      gapPadding: gapStyle.paddingLeft,
      gapMarkWidth: gapMarkStyle.width,
      evidenceSource: excerpt.dataset.v3Source,
      evidenceReview: excerpt.dataset.v3Review,
      excerptPadding: excerptStyle.paddingLeft,
      excerptRadius: excerptStyle.borderRadius,
      proseFamily: proseStyle.fontFamily,
      proseSize: proseStyle.fontSize,
      proseLineHeight: proseStyle.lineHeight,
      componentCounts: {
        stateChip: document.querySelectorAll('[data-v3-component="StateChip"]').length,
        biggestGap: document.querySelectorAll('[data-v3-component="BiggestGap"]').length,
        evidenceExcerpt: document.querySelectorAll('[data-v3-component="EvidenceExcerpt"]').length,
      },
    };
  });
}

test("S232B exact-head persisted Study Ledger passive component contract", async ({ page }, testInfo: TestInfo) => {
  requireSafeAuthenticatedRuntime("S232B", { requireTargetSha: true, requireExactHead: true });
  const runtimeErrors = monitorRuntimeErrors(page);
  await establishProtectedPreviewSession(page, "S232B");
  const { signInAttempts } = await loginWithDedicatedTestAccount(page, "second");

  const observedVersion = await page.evaluate(async () => {
    const response = await fetch("/api/runtime/version", { cache: "no-store", credentials: "same-origin" });
    return { status: response.status, body: await response.json() as { ready?: boolean; deploymentSha?: string } };
  });
  expect(observedVersion.status).toBe(200);
  expect(observedVersion.body.ready).toBe(true);
  expect(observedVersion.body.deploymentSha).toBe(runtimeTargetSha);

  const componentEvidence: Array<Record<string, unknown>> = [];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const detail = await findPersistedDetailWithPassiveComponents(page);
    await expect(page.locator("main:visible")).toHaveCount(1);
    await expect(page.locator("h1:visible")).toHaveCount(1);
    await expect(detail.locator('[data-v3-component="StateChip"]')).toHaveCount(1);
    await expect(detail.locator('[data-v3-component="BiggestGap"]')).toHaveCount(1);
    await expect(detail.locator('[data-v3-component="EvidenceExcerpt"]')).toHaveCount(1);
    await expect(detail.locator('[data-v3-component="StateChip"]')).toContainText(/미확인|회복 중/);
    await expect(detail.locator('[data-v3-component="BiggestGap"]')).toContainText("가장 큰 간극 1개");
    await expect(detail.locator('[data-v3-component="EvidenceExcerpt"]')).toContainText("학습자 근거");
    await expect(detail.locator('[data-v3-component="EvidenceExcerpt"]')).toContainText("확인 필요");

    const metrics = await passiveComponentMetrics(page);
    expect(metrics).not.toBeNull();
    expect(metrics?.pageEdge).toBe(viewport.expectedPageEdge);
    expect(metrics?.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(["Unverified", "Recovering"]).toContain(metrics?.state);
    expect(["scheduled", "attention", "ready", "completed"]).toContain(metrics?.legacyState);
    expect(metrics?.chipHeight).toBeGreaterThanOrEqual(38);
    expect(metrics).toMatchObject({
      gapType: "MissingLink",
      gapDensity: "Default",
      gapPadding: "16px",
      gapMarkWidth: "4px",
      evidenceSource: "Learner",
      evidenceReview: "Default",
      excerptPadding: "24px",
      excerptRadius: "14px",
      proseSize: "17px",
      proseLineHeight: "30px",
      componentCounts: { stateChip: 1, biggestGap: 1, evidenceExcerpt: 1 },
    });
    expect(metrics?.proseFamily).toContain("Noto Serif KR Variable");
    componentEvidence.push({ viewport: viewport.label, ...metrics });
  }

  expect(runtimeErrors).toEqual({ consoleErrors: [], pageErrors: [], sameOriginRequestFailures: [] });
  const evidence = {
    schemaVersion: 1,
    result: "pass",
    runnerSha: runtimeRunnerSha,
    targetDeploymentSha: runtimeTargetSha,
    observedDeploymentSha: observedVersion.body.deploymentSha,
    signInAttempts,
    persistedDetailAvailable: true,
    componentEvidence,
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
  await writeFile(testInfo.outputPath("s232b-runtime.json"), JSON.stringify(evidence, null, 2));
});
