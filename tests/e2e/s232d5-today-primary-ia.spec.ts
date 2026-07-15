import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

import {
  establishProtectedPreviewSession,
  loginWithDedicatedTestAccount,
  monitorRuntimeErrors,
  requireSafeAuthenticatedRuntime,
  runtimeBaseUrl,
  runtimeRunnerSha,
  runtimeTargetSha,
} from "./support/authenticated-runtime";

const runtimeEnabled = process.env.S232D5_AUTH_RUNTIME === "1";

const viewports = [
  { label: "390", width: 390, height: 844 },
  { label: "768", width: 768, height: 1024 },
  { label: "1440", width: 1440, height: 1024 },
] as const;

const readOnlyMethods = new Set(["GET", "HEAD", "OPTIONS"]);

test.use({ screenshot: "off", trace: "off", video: "off" });
test.skip(!runtimeEnabled, "Set S232D5_AUTH_RUNTIME=1 for exact-head Today IA acceptance.");
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

async function readFocusStyle(target: Locator) {
  return target.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      focusVisible: element.matches(":focus-visible"),
      outline: `${style.outlineWidth}|${style.outlineStyle}|${style.outlineColor}`,
      boxShadow: style.boxShadow,
      borderColor: style.borderColor,
      backgroundColor: style.backgroundColor,
    };
  });
}

async function expectVisibleKeyboardFocus(
  target: Locator,
  unfocusedStyle: Awaited<ReturnType<typeof readFocusStyle>>,
) {
  await expect(target).toBeFocused();
  const focus = await readFocusStyle(target);
  expect(focus.focusVisible, "The keyboard target must match :focus-visible.").toBe(true);
  expect(
    focus.outline !== unfocusedStyle.outline ||
      focus.boxShadow !== unfocusedStyle.boxShadow ||
      focus.borderColor !== unfocusedStyle.borderColor ||
      focus.backgroundColor !== unfocusedStyle.backgroundColor,
    "The focused target must expose a computed visual-style delta.",
  ).toBe(true);
}

async function tabUntilFocused(
  page: Page,
  target: Locator,
  unfocusedStyle: Awaited<ReturnType<typeof readFocusStyle>>,
  maxSteps: number,
  description: string,
) {
  let reached = false;
  for (let step = 0; step < maxSteps; step += 1) {
    await page.keyboard.press("Tab");
    reached = await target.evaluate((element) => element === document.activeElement);
    if (reached) break;
  }
  expect(reached, description).toBe(true);
  await expectVisibleKeyboardFocus(target, unfocusedStyle);
}

async function resetKeyboardStart(page: Page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
}

async function readBrowserStorageDigest(page: Page) {
  return page.evaluate(async () => {
    const serialize = (storage: Storage) => {
      const entries: Array<[string, string]> = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key !== null) entries.push([key, storage.getItem(key) ?? ""]);
      }
      entries.sort(([left], [right]) => left.localeCompare(right));
      return JSON.stringify(entries);
    };
    const payload = `${serialize(window.localStorage)}\u0000${serialize(window.sessionStorage)}`;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
    return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
  });
}

async function readAnalyticsLengths(page: Page) {
  return page.evaluate(() => {
    const runtimeWindow = window as Window & {
      dataLayer?: unknown;
      invergeDataLayer?: unknown;
    };
    return {
      dataLayer: Array.isArray(runtimeWindow.dataLayer) ? runtimeWindow.dataLayer.length : 0,
      invergeDataLayer: Array.isArray(runtimeWindow.invergeDataLayer)
        ? runtimeWindow.invergeDataLayer.length
        : 0,
    };
  });
}

test("S232D.5 exact-head Today IA is responsive, accessible, and interaction-safe", async ({ page }, testInfo: TestInfo) => {
  requireSafeAuthenticatedRuntime("S232D.5", {
    requireTargetSha: true,
    requireExactHead: true,
  });

  // The first authenticated Today render must happen at 390px. Subsequent
  // viewport checks resize this same document and never reload Today.
  await page.setViewportSize({ width: viewports[0].width, height: viewports[0].height });
  await establishProtectedPreviewSession(page, "S232D.5");
  const runtimeErrors = monitorRuntimeErrors(page);
  const { signInAttempts } = await loginWithDedicatedTestAccount(page, "second");

  const pageRoot = page.locator('[data-s232d5-today-page="single-priority"]');
  await expect(pageRoot).toBeVisible();
  let mainFrameDocumentNavigationRequestCount = 0;
  page.on("request", (request) => {
    if (
      request.isNavigationRequest() &&
      request.frame() === page.mainFrame() &&
      request.resourceType() === "document"
    ) {
      mainFrameDocumentNavigationRequestCount += 1;
    }
  });
  const documentIdentity = await page.evaluate(() => {
    const identity = crypto.randomUUID();
    Object.defineProperty(window, "__s232d5TodayDocumentIdentity", {
      value: identity,
      configurable: false,
      enumerable: false,
      writable: false,
    });
    return identity;
  });
  const observedBefore = await readObservedDeploymentSha(page);
  expect(observedBefore).toEqual({
    status: 200,
    ready: true,
    deploymentSha: runtimeTargetSha,
  });

  const storageBefore = await readBrowserStorageDigest(page);
  const analyticsBefore = await readAnalyticsLengths(page);
  const runtimeOrigin = new URL(runtimeBaseUrl).origin;
  let learnerActionMutationRequestCount = 0;

  // Prevent any post-render same-origin non-read request from reaching the
  // application. A request attempt still fails this acceptance via the count.
  await page.context().route("**/*", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    if (requestUrl.origin === runtimeOrigin && !readOnlyMethods.has(request.method())) {
      learnerActionMutationRequestCount += 1;
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });

  let maxObservedTodayTaskCount = 0;
  let axeBlockingCount = 0;
  let resizedSameDocumentVerified = true;

  for (const [index, viewport] of viewports.entries()) {
    if (index > 0) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    }

    const sameDocument = await page.evaluate(
      (expectedIdentity) =>
        (window as Window & { __s232d5TodayDocumentIdentity?: string })
          .__s232d5TodayDocumentIdentity === expectedIdentity,
      documentIdentity,
    );
    resizedSameDocumentVerified =
      resizedSameDocumentVerified &&
      sameDocument &&
      mainFrameDocumentNavigationRequestCount === 0;
    expect(sameDocument, `The ${viewport.label}px check must use the authenticated document.`).toBe(true);
    expect(
      mainFrameDocumentNavigationRequestCount,
      "Viewport checks must not issue a new main-frame document navigation request.",
    ).toBe(0);

    const primary = pageRoot.locator("[data-s232d5-today-primary]");
    const meta = primary.locator("[data-s232d5-today-meta]");
    const heading = primary.locator("h1#s232d5-today-title.v3-type-screen");
    const context = primary.locator("dl[data-s232d5-today-context]");
    const reason = context.locator("[data-s232d5-today-reason]");
    const duration = context.locator("[data-s232d5-today-duration]");
    const continuation = context.locator("[data-s232d5-today-continuation]");
    const primaryCta = primary.locator("[data-s232d5-today-primary-cta]");
    const secondary = pageRoot.locator("details[data-s232d5-today-secondary]");
    const currentTodayLink = page
      .getByRole("navigation", { name: "학습 메뉴" })
      .locator('[aria-current="page"]');

    await expect(page.locator("main#learner-main")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(pageRoot).toHaveCount(1);
    await expect(primary).toHaveCount(1);
    await expect(primary).toHaveAttribute("aria-labelledby", "s232d5-today-title");
    await expect(meta).toHaveCount(1);
    await expect(meta.getByText("오늘 할 일 · 오늘의 1개", { exact: true })).toHaveCount(1);
    await expect(heading).toHaveCount(1);
    await expect(pageRoot.locator("h1")).toHaveCount(1);
    expect(await heading.evaluate((element) => Boolean(element.textContent?.trim()))).toBe(true);
    await expect(context).toHaveCount(1);
    await expect(context.locator("dt")).toHaveCount(3);
    await expect(context.locator("dd")).toHaveCount(3);
    await expect(reason).toHaveCount(1);
    await expect(duration).toHaveCount(1);
    await expect(continuation).toHaveCount(1);
    await expect(primaryCta).toHaveCount(1);
    await expect(pageRoot.locator("[data-s226-primary-cta]")).toHaveCount(1);
    await expect(currentTodayLink).toHaveCount(1);
    expect(
      await currentTodayLink.evaluate((element) =>
        element instanceof HTMLAnchorElement && new URL(element.href).pathname === "/app",
      ),
    ).toBe(true);

    const hierarchy = await primary.evaluate((element) => {
      const reasonNode = element.querySelector("[data-s232d5-today-reason]");
      const durationNode = element.querySelector("[data-s232d5-today-duration]");
      const continuationNode = element.querySelector("[data-s232d5-today-continuation]");
      const actionNode = element.querySelector("[data-s232d5-today-primary-cta]");
      if (!reasonNode || !durationNode || !continuationNode || !actionNode) return false;
      const follows = (before: Node, after: Node) =>
        Boolean(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING);
      return (
        follows(reasonNode, durationNode) &&
        follows(durationNode, continuationNode) &&
        follows(continuationNode, actionNode)
      );
    });
    expect(hierarchy, "Today DOM order must be reason → duration → continuation → dominant CTA.").toBe(true);

    const todayTaskCount = await pageRoot.locator("[data-s232d5-today-task]").count();
    expect(todayTaskCount).toBeGreaterThanOrEqual(0);
    expect(todayTaskCount).toBeLessThanOrEqual(3);
    maxObservedTodayTaskCount = Math.max(maxObservedTodayTaskCount, todayTaskCount);

    await expect(secondary).toHaveCount(1);
    await expect(secondary).not.toHaveAttribute("open", "");
    await expect(pageRoot.locator("details[data-s224v-secondary-diagnostics][open]")).toHaveCount(0);

    const layout = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);

    await resetKeyboardStart(page);
    const primaryCtaUnfocusedStyle = await readFocusStyle(primaryCta);
    const secondarySummary = secondary.locator(":scope > summary");
    const secondarySummaryUnfocusedStyle = await readFocusStyle(secondarySummary);
    await page.keyboard.press("Tab");
    const skipLink = page.locator('a[href="#learner-main"]');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#learner-main")).toBeFocused();

    await tabUntilFocused(
      page,
      primaryCta,
      primaryCtaUnfocusedStyle,
      30,
      "The dominant Today action must be reachable from the skip link with real Tab navigation.",
    );
    await tabUntilFocused(
      page,
      secondarySummary,
      secondarySummaryUnfocusedStyle,
      80,
      "The non-persistent secondary disclosure must be reachable after the dominant action.",
    );
    await page.keyboard.press("Enter");
    await expect(secondary).toHaveAttribute("open", "");
    await page.keyboard.press("Enter");
    await expect(secondary).not.toHaveAttribute("open", "");
    expect(
      learnerActionMutationRequestCount,
      "Keyboard verification must not initiate learner action, completion, capture, feedback, or telemetry writes.",
    ).toBe(0);

    const axe = await new AxeBuilder({ page })
      .include('[data-s232d5-today-page="single-priority"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const blockingAxe = axe.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    axeBlockingCount += blockingAxe.length;
    const blockingRuleIds = [...new Set(blockingAxe.map((violation) => violation.id))].sort();
    expect(
      blockingAxe.length,
      `Axe blocking rule count must be zero at ${viewport.label}px; ids=${blockingRuleIds.join(",") || "none"}`,
    ).toBe(0);
  }

  const storageAfter = await readBrowserStorageDigest(page);
  const analyticsAfter = await readAnalyticsLengths(page);
  expect(storageAfter === storageBefore, "Today acceptance must not change browser storage.").toBe(true);
  expect(analyticsAfter.dataLayer === analyticsBefore.dataLayer, "dataLayer length must remain stable.").toBe(true);
  expect(
    analyticsAfter.invergeDataLayer === analyticsBefore.invergeDataLayer,
    "invergeDataLayer length must remain stable.",
  ).toBe(true);

  const analyticsEventDelta =
    analyticsAfter.dataLayer - analyticsBefore.dataLayer +
    analyticsAfter.invergeDataLayer - analyticsBefore.invergeDataLayer;
  const observedAfter = await readObservedDeploymentSha(page);
  expect(observedAfter).toEqual(observedBefore);
  expect(resizedSameDocumentVerified).toBe(true);
  expect(mainFrameDocumentNavigationRequestCount).toBe(0);
  expect(learnerActionMutationRequestCount).toBe(0);
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
    initialAuthenticatedRenderWidth: viewports[0].width,
    resizedSameDocumentVerified,
    mainFrameDocumentNavigationRequestCount,
    pageHeadingCount: 1,
    labelledPrimarySurfaceCount: 1,
    dominantActionCount: 1,
    maxObservedTodayTaskCount,
    missionHierarchyVerified: true,
    canonicalEyebrowVerified: true,
    v3ScreenTypographyVerified: true,
    currentNavigationVerified: true,
    maxThreeVerified: true,
    secondaryDisclosuresClosedVerified: true,
    keyboardFocusVerified: true,
    localDisclosureInteractionVerified: true,
    responsiveOverflowVerified: true,
    axeBlockingCount,
    learnerActionMutationRequestCount,
    browserStorageMutationCount: 0,
    analyticsEventDelta,
    consoleErrorCount: runtimeErrors.consoleErrors.length,
    pageErrorCount: runtimeErrors.pageErrors.length,
    sameOriginRequestFailureCount: runtimeErrors.sameOriginRequestFailures.length,
    globalDatabaseImmutabilityClaimed: false,
    credentialsCaptured: false,
    rawLearnerContentCaptured: false,
    questionTextCaptured: false,
    taskTitleCaptured: false,
    subjectCaptured: false,
    urlCaptured: false,
    emailCaptured: false,
    domCaptured: false,
    screenshotCaptured: false,
    traceCaptured: false,
    videoCaptured: false,
  };
  const serializedEvidence = JSON.stringify(evidence);
  expect(serializedEvidence).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
  expect(serializedEvidence).not.toMatch(/https?:\/\/|\/app\//i);
  await writeFile(testInfo.outputPath("s232d5-runtime.json"), JSON.stringify(evidence, null, 2));
});
