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

const runtimeEnabled = process.env.S232E1_AUTH_RUNTIME === "1";

const viewports = [
  { label: "390", width: 390, height: 844 },
  { label: "768", width: 768, height: 1024 },
  { label: "1440", width: 1440, height: 1024 },
] as const;

const readOnlyMethods = new Set(["GET", "HEAD", "OPTIONS"]);

test.use({ screenshot: "off", trace: "off", video: "off" });
test.skip(!runtimeEnabled, "Set S232E1_AUTH_RUNTIME=1 for exact-head Capture acceptance.");
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

test("S232E.1 exact-head Capture shell is responsive, semantic, and action-safe", async ({ page }, testInfo: TestInfo) => {
  requireSafeAuthenticatedRuntime("S232E.1", {
    requireTargetSha: true,
    requireExactHead: true,
  });

  await page.setViewportSize({ width: viewports[0].width, height: viewports[0].height });
  await establishProtectedPreviewSession(page, "S232E.1");
  const runtimeErrors = monitorRuntimeErrors(page);
  const { signInAttempts } = await loginWithDedicatedTestAccount(page, "second");
  await page.goto("/app/capture?mode=second", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  const pageRoot = page.locator('[data-s224v-surface="/app/capture"]');
  const captureForm = pageRoot.locator('form[data-s232e-capture-flow="four-stage"]');
  await expect(captureForm).toBeVisible();

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
    Object.defineProperty(window, "__s232e1CaptureDocumentIdentity", {
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

  let axeBlockingCount = 0;
  let resizedSameDocumentVerified = true;
  let keyboardFocusVerified = false;
  let localDisclosureInteractionVerified = false;

  for (const [index, viewport] of viewports.entries()) {
    if (index > 0) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    }

    const sameDocument = await page.evaluate(
      (expectedIdentity) =>
        (window as Window & { __s232e1CaptureDocumentIdentity?: string })
          .__s232e1CaptureDocumentIdentity === expectedIdentity,
      documentIdentity,
    );
    resizedSameDocumentVerified =
      resizedSameDocumentVerified && sameDocument && mainFrameDocumentNavigationRequestCount === 0;
    expect(sameDocument, `The ${viewport.label}px check must use the authenticated Capture document.`).toBe(true);
    expect(mainFrameDocumentNavigationRequestCount).toBe(0);

    const heading = pageRoot.locator("h1#capture-page-title.v3-type-screen");
    const stageList = captureForm.locator('ol[data-capture-stage-flow][aria-label="Capture 4단계 흐름"]');
    const accessibleStageList = captureForm.getByRole("list", { name: "Capture 4단계 흐름" });
    const stageItems = stageList.locator("li[data-capture-stage]");
    const accessibleStageItems = accessibleStageList.getByRole("listitem");
    const currentStage = stageList.locator('li[data-capture-stage][aria-current="step"]');
    const stageContext = captureForm.locator("[data-capture-stage-context]");
    const stageExplanation = stageContext.locator("dl[data-capture-stage-explanation]");
    const dominantInput = captureForm.locator("[data-s226-capture-primary-action]");
    const optionalDisclosures = captureForm.locator("details");
    const optionalDisclosure = captureForm.locator("details[data-s232e-capture-optional-inputs]");
    const optionalSummary = optionalDisclosure.locator("summary");

    await expect(pageRoot).toHaveCount(1);
    await expect(captureForm).toHaveCount(1);
    await expect(captureForm).toHaveAttribute("aria-labelledby", "capture-page-title");
    await expect(captureForm).toHaveAttribute("data-s232e-capture-step", "1");
    await expect(captureForm).toHaveAttribute("data-s232e-capture-stage", "intake");
    await expect(heading).toHaveCount(1);
    await expect(pageRoot.locator("h1")).toHaveCount(1);
    await expect(stageList).toHaveCount(1);
    await expect(accessibleStageList).toHaveCount(1);
    await expect(stageItems).toHaveCount(4);
    await expect(accessibleStageItems).toHaveCount(4);
    await expect(currentStage).toHaveCount(1);
    await expect(currentStage).toHaveAttribute("data-capture-stage", "1");
    await expect(stageContext).toHaveAttribute("data-capture-stage-current", "1");
    await expect(stageContext).toHaveAttribute("data-capture-controller-stage", "intake");
    await expect(stageContext.locator("h2#capture-stage-current-title.v3-type-section")).toHaveCount(1);
    await expect(stageExplanation.locator("dt")).toHaveCount(2);
    await expect(stageExplanation.locator("dd")).toHaveCount(2);
    await expect(stageExplanation.getByText("왜 필요한가", { exact: true })).toHaveCount(1);
    await expect(stageExplanation.getByText("다음 결과", { exact: true })).toHaveCount(1);
    await expect(dominantInput).toHaveCount(1);
    expect(await optionalDisclosures.count()).toBeGreaterThan(0);
    expect(
      await optionalDisclosures.evaluateAll((elements) =>
        elements.every((element) => element instanceof HTMLDetailsElement && !element.open),
      ),
      "Every optional Capture disclosure must be closed by default.",
    ).toBe(true);
    expect(
      await dominantInput.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= window.innerHeight;
      }),
      `${viewport.label}px must keep the dominant Capture input action above the fold.`,
    ).toBe(true);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${viewport.label}px must not overflow horizontally.`).toBeLessThanOrEqual(1);

    if (index === 0) {
      await resetKeyboardStart(page);
      const dominantInputBaseline = await readFocusStyle(dominantInput);
      await tabUntilFocused(page, dominantInput, dominantInputBaseline, 50, "Tab must reach the dominant Capture input action.");

      await resetKeyboardStart(page);
      const summaryBaseline = await readFocusStyle(optionalSummary);
      await tabUntilFocused(page, optionalSummary, summaryBaseline, 80, "Tab must reach the optional Capture disclosure.");
      await page.keyboard.press("Enter");
      await expect(optionalDisclosure).toHaveAttribute("open", "");
      await page.keyboard.press("Enter");
      await expect(optionalDisclosure).not.toHaveAttribute("open", "");
      keyboardFocusVerified = true;
      localDisclosureInteractionVerified = true;
    }

    const accessibility = await new AxeBuilder({ page })
      .include('[data-s224v-surface="/app/capture"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const blocking = accessibility.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    axeBlockingCount += blocking.length;
    expect(blocking, `${viewport.label}px Axe serious/critical violations`).toEqual([]);
  }

  const observedAfter = await readObservedDeploymentSha(page);
  expect(observedAfter).toEqual(observedBefore);
  const storageAfter = await readBrowserStorageDigest(page);
  const analyticsAfter = await readAnalyticsLengths(page);

  expect(storageAfter).toBe(storageBefore);
  expect(analyticsAfter).toEqual(analyticsBefore);
  expect(learnerActionMutationRequestCount).toBe(0);
  expect(runtimeErrors.consoleErrors).toEqual([]);
  expect(runtimeErrors.pageErrors).toEqual([]);
  expect(runtimeErrors.sameOriginRequestFailures).toEqual([]);

  const evidence = {
    schemaVersion: 1,
    result: "pass",
    runnerSha: runtimeRunnerSha,
    targetDeploymentSha: runtimeTargetSha,
    observedDeploymentSha: observedAfter.deploymentSha ?? "",
    signInAttempts,
    viewportCount: viewports.length,
    initialAuthenticatedRenderWidth: viewports[0].width,
    resizedSameDocumentVerified,
    mainFrameDocumentNavigationRequestCount,
    pageHeadingCount: 1,
    stageCount: 4,
    currentStageCount: 1,
    stageContextDefinitionCount: 2,
    fourStageIndicatorVerified: true,
    v3RoleClassesPresent: true,
    oneDominantInputActionVerified: true,
    dominantActionAboveFoldVerified: true,
    optionalDisclosuresClosedVerified: true,
    keyboardFocusVerified,
    localDisclosureInteractionVerified,
    responsiveOverflowVerified: true,
    axeBlockingCount,
    learnerActionMutationRequestCount,
    browserStorageMutationCount: storageAfter === storageBefore ? 0 : 1,
    analyticsEventDelta:
      analyticsAfter.dataLayer - analyticsBefore.dataLayer +
      analyticsAfter.invergeDataLayer - analyticsBefore.invergeDataLayer,
    consoleErrorCount: runtimeErrors.consoleErrors.length,
    pageErrorCount: runtimeErrors.pageErrors.length,
    sameOriginRequestFailureCount: runtimeErrors.sameOriginRequestFailures.length,
    globalDatabaseImmutabilityClaimed: false,
    credentialsCaptured: false,
    rawLearnerContentCaptured: false,
    ocrTextCaptured: false,
    questionTextCaptured: false,
    subjectCaptured: false,
    urlCaptured: false,
    emailCaptured: false,
    domCaptured: false,
    screenshotCaptured: false,
    traceCaptured: false,
    videoCaptured: false,
  };

  await writeFile(testInfo.outputPath("s232e1-runtime.json"), JSON.stringify(evidence, null, 2), "utf8");
});
