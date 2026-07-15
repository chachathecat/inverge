import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";

import {
  establishProtectedPreviewSession,
  loginWithDedicatedTestAccount,
  monitorRuntimeErrors,
  requireSafeAuthenticatedRuntime,
  runtimeRunnerSha,
  runtimeTargetSha,
} from "./support/authenticated-runtime";

const runtimeEnabled = process.env.S232B2_AUTH_RUNTIME === "1";

const viewports = [
  { label: "390", width: 390, height: 844, placement: "Dock" },
  { label: "1440", width: 1440, height: 1024, placement: "Inline" },
] as const;

test.use({ screenshot: "off", trace: "off", video: "off" });
test.skip(!runtimeEnabled, "Set S232B2_AUTH_RUNTIME=1 for exact-head StickyAction acceptance.");
test.describe.configure({ timeout: 300_000, retries: 0 });

async function findPersistedStickyActionDetailHref(page: Page) {
  await page.goto("/app/items?mode=second", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-s224v-surface="/app/items"]')).toBeVisible({ timeout: 20_000 });
  const detailHrefs = await page
    .locator('a[href^="/app/items/"]')
    .filter({ hasText: "노트 자세히 보기" })
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")).filter(Boolean) as string[],
    );

  for (const href of detailHrefs.slice(0, 12)) {
    await page.goto(href, { waitUntil: "domcontentloaded" });
    const detail = page.locator("[data-s228-study-ledger-detail]");
    await expect(detail).toBeVisible({ timeout: 20_000 });
    if (await detail.locator('[data-v3-component="StickyAction"]').count()) return href;
  }

  return null;
}

async function createSyntheticStickyActionDetailHref(page: Page) {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
  const syntheticParagraph =
    "보상액 산정 기준과 적용 근거를 순서대로 연결합니다. S232B.2 합성 테스트 기록입니다.";
  const syntheticGap = "기준과 근거 사이의 연결 문장을 한 번 더 확인합니다.";
  const response = await page.context().request.post("/api/os/items", {
    data: {
      examName: "감정평가사 2차",
      subjectLabel: "감정평가실무",
      sourceType: "text",
      sourceLabel: "S232B.2 synthetic runtime acceptance",
      problemTitle: `S232B.2 synthetic StickyAction detail ${suffix}`,
      rawQuestionText: "보상액 산정 기준과 적용 근거를 설명하시오. 합성 테스트 데이터입니다.",
      rawAnswerText: syntheticParagraph,
      correctAnswer: "기준과 적용 근거를 순서대로 설명합니다.",
      userAnswer: syntheticParagraph,
      userReasonText: syntheticGap,
      confidence: "중간",
      keyConcepts: ["산정 기준", "적용 근거"],
      missingIssue: syntheticGap,
      weakStructurePoint: syntheticGap,
      rewriteInstruction: "기준과 근거를 한 문단에 연결합니다.",
      myAnswerSummary: syntheticParagraph,
      biggestGap: syntheticGap,
      captureIntent: "save",
      createdFromCapture: true,
      extractionPayload: {
        raw_ocr_text: syntheticParagraph,
        raw_extraction_json: {},
        normalized_draft: null,
        user_confirmed_fields: {
          subjectLabel: "감정평가실무",
          userAnswer: syntheticParagraph,
          sourceType: "text",
          examMode: "second",
          hasManualCorrection: true,
          ocrConfirmedByLearner: true,
        },
      },
    },
  });
  expect(response.ok(), "Dedicated-account StickyAction fixture must persist through the normal item API.").toBe(true);
  const body = (await response.json()) as { ok?: boolean; item?: { id?: string }; error?: string };
  expect(body.ok, body.error ?? "StickyAction fixture response must be ok.").toBe(true);
  expect(body.item?.id).toBeTruthy();
  return `/app/items/${encodeURIComponent(body.item!.id!)}?mode=second`;
}

async function ensureStickyActionDetailHref(page: Page) {
  return (
    (await findPersistedStickyActionDetailHref(page)) ??
    (await createSyntheticStickyActionDetailHref(page))
  );
}

async function tabTo(page: Page, target: Locator) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  for (let stops = 1; stops <= 80; stops += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement)) return stops;
  }
  throw new Error("StickyAction must be reachable with Tab within 80 focus stops.");
}

test("S232B.2 exact-head Study Ledger action placement and rewrite navigation", async ({ page }, testInfo: TestInfo) => {
  requireSafeAuthenticatedRuntime("S232B.2", {
    requireTargetSha: true,
    requireExactHead: true,
  });
  const runtimeErrors = monitorRuntimeErrors(page);
  await establishProtectedPreviewSession(page, "S232B.2");
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

  const detailHref = await ensureStickyActionDetailHref(page);
  const viewportEvidence: Array<Record<string, unknown>> = [];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(detailHref, { waitUntil: "domcontentloaded" });
    const detail = page.locator("[data-s228-study-ledger-detail]");
    const readingColumn = detail.locator("[data-s232b1-reading-column]");
    const rail = detail.locator("[data-s228-evidence-rail]");
    const action = detail.locator('[data-v3-component="StickyAction"]');
    const control = action.locator("[data-s228-primary-action]");
    const status = action.getByRole("status");

    await expect(detail).toBeVisible({ timeout: 20_000 });
    await expect(action).toHaveCount(1);
    await expect(readingColumn.locator('[data-v3-component="StickyAction"]')).toHaveCount(1);
    await expect(rail.locator('[data-v3-component="StickyAction"]')).toHaveCount(0);
    await expect(action).toHaveAttribute("data-v3-state", "Ready");
    await expect(action).toHaveAttribute("data-s232b2-responsive", "Dock-to-Inline");
    await expect(control).toHaveJSProperty("tagName", "A");
    await expect(control).toBeEnabled();
    await expect(status).toBeVisible();

    const metrics = await page.evaluate(() => {
      const detailElement = document.querySelector<HTMLElement>("[data-s228-study-ledger-detail]");
      const reading = detailElement?.querySelector<HTMLElement>("[data-s232b1-reading-column]");
      const railElement = detailElement?.querySelector<HTMLElement>("[data-s228-evidence-rail]");
      const actionElement = detailElement?.querySelector<HTMLElement>('[data-v3-component="StickyAction"]');
      const statusElement = actionElement?.querySelector<HTMLElement>('[role="status"]');
      const controlElement = actionElement?.querySelector<HTMLElement>("[data-s228-primary-action]");
      if (!detailElement || !reading || !railElement || !actionElement || !statusElement || !controlElement) {
        return null;
      }
      const actionRect = actionElement.getBoundingClientRect();
      const statusRect = statusElement.getBoundingClientRect();
      const controlRect = controlElement.getBoundingClientRect();
      const actionStyle = getComputedStyle(actionElement);
      const detailStyle = getComputedStyle(detailElement);
      const shadowColors = actionStyle.boxShadow.match(/rgba?\([^)]+\)/g) ?? [];
      const boxShadowVisible =
        actionStyle.boxShadow !== "none" &&
        shadowColors.some((color) => {
          const channels = color.match(/[\d.]+/g)?.map(Number) ?? [];
          return channels.length < 4 || channels[3] > 0;
        });
      return {
        horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        componentCount: detailElement.querySelectorAll('[data-v3-component="StickyAction"]').length,
        readingCount: reading.querySelectorAll('[data-v3-component="StickyAction"]').length,
        railCount: railElement.querySelectorAll('[data-v3-component="StickyAction"]').length,
        position: actionStyle.position,
        componentWidth: actionRect.width,
        componentHeight: actionRect.height,
        left: actionRect.left,
        bottomGap: window.innerHeight - actionRect.bottom,
        statusWidth: statusRect.width,
        statusHeight: statusRect.height,
        statusTop: statusRect.top - actionRect.top,
        controlWidth: controlRect.width,
        controlHeight: controlRect.height,
        controlTop: controlRect.top - actionRect.top,
        readingWidth: reading.getBoundingClientRect().width,
        articleBottomPadding: Number.parseFloat(detailStyle.paddingBottom),
        background: actionStyle.backgroundColor,
        borderTopWidth: actionStyle.borderTopWidth,
        boxShadowVisible,
      };
    });
    expect(metrics).not.toBeNull();
    expect(metrics?.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(metrics).toMatchObject({ componentCount: 1, readingCount: 1, railCount: 0 });
    expect(metrics?.controlHeight).toBeCloseTo(52, 0);
    expect(metrics?.statusHeight).toBeCloseTo(18, 0);

    if (viewport.placement === "Dock") {
      expect(metrics).toMatchObject({
        position: "fixed",
        componentWidth: 390,
        componentHeight: 116,
        left: 0,
        bottomGap: 0,
        statusWidth: 350,
        controlWidth: 350,
        background: "rgb(255, 255, 255)",
        borderTopWidth: "1px",
      });
      expect(metrics?.statusTop).toBeGreaterThanOrEqual(16);
      expect(metrics?.statusTop).toBeLessThanOrEqual(17);
      expect(metrics?.controlTop).toBeGreaterThanOrEqual(42);
      expect(metrics?.controlTop).toBeLessThanOrEqual(43);
      expect(metrics?.boxShadowVisible).toBe(true);
      expect(metrics?.articleBottomPadding).toBeGreaterThanOrEqual(136);
    } else {
      expect(metrics).toMatchObject({
        position: "static",
        componentWidth: 300,
        componentHeight: 84,
        statusWidth: 300,
        controlWidth: 300,
        statusTop: 0,
        controlTop: 26,
        readingWidth: 680,
        background: "rgba(0, 0, 0, 0)",
        borderTopWidth: "0px",
        boxShadowVisible: false,
      });
    }

    const tabStops = await tabTo(page, control);
    const focusEvidence = await control.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return {
        visible:
          rect.width >= 44 &&
          rect.height >= 44 &&
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth,
        indicator: style.outlineStyle !== "none" || style.boxShadow !== "none",
        topmost: hit === element || element.contains(hit),
      };
    });
    expect(tabStops).toBeGreaterThan(0);
    expect(focusEvidence).toEqual({ visible: true, indicator: true, topmost: true });

    const href = await control.getAttribute("href");
    expect(href).toBeTruthy();
    const expectedDestination = new URL(href!, page.url());
    const expectedRewriteFrom = expectedDestination.searchParams.get("rewriteFrom");
    expect(expectedDestination.pathname).toBe("/app/capture");
    expect(expectedDestination.searchParams.get("mode")).toBe("second");
    expect(expectedRewriteFrom).toBeTruthy();

    const axe = await new AxeBuilder({ page })
      .include("[data-s228-study-ledger-detail]")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const blockingAxe = axe.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(blockingAxe).toEqual([]);

    await Promise.all([
      page.waitForURL(
        (url) =>
          url.pathname === "/app/capture" &&
          url.searchParams.get("mode") === "second" &&
          url.searchParams.get("rewriteFrom") === expectedRewriteFrom,
        { timeout: 20_000 },
      ),
      page.keyboard.press("Enter"),
    ]);
    await expect(page.getByText("문단 다시쓰기 컨텍스트", { exact: true })).toBeVisible({
      timeout: 20_000,
    });

    viewportEvidence.push({
      viewport: viewport.label,
      placement: viewport.placement,
      componentCount: metrics?.componentCount,
      readingCount: metrics?.readingCount,
      railCount: metrics?.railCount,
      componentGeometryValid: true,
      statusGeometryValid: true,
      targetGeometryValid: true,
      safeAreaClearanceValid: true,
      tabFocusValid: true,
      focusIndicatorValid: focusEvidence.indicator,
      topmostHitTargetValid: focusEvidence.topmost,
      enterNavigationValid: true,
      rewriteContextVisible: true,
      horizontalOverflow: metrics?.horizontalOverflow,
      axeBlockingCount: blockingAxe.length,
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
  await writeFile(testInfo.outputPath("s232b2-runtime.json"), JSON.stringify(evidence, null, 2));
});
