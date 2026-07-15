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

const runtimeEnabled = process.env.S232E3_AUTH_RUNTIME === "1";

const viewports = [
  { label: "390", width: 390, height: 844 },
  { label: "768", width: 768, height: 1024 },
  { label: "1440", width: 1440, height: 1024 },
] as const;

const readOnlyMethods = new Set(["GET", "HEAD", "OPTIONS"]);

test.use({ screenshot: "off", trace: "off", video: "off" });
test.skip(!runtimeEnabled, "Set S232E3_AUTH_RUNTIME=1 for exact-head Answer Review acceptance.");
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

test("S232E.3 exact-head Answer Review entry is responsive, semantic, and action-safe", async ({ page }, testInfo: TestInfo) => {
  requireSafeAuthenticatedRuntime("S232E.3", {
    requireTargetSha: true,
    requireExactHead: true,
  });

  await page.setViewportSize({ width: viewports[0].width, height: viewports[0].height });
  await establishProtectedPreviewSession(page, "S232E.3");
  const runtimeErrors = monitorRuntimeErrors(page);
  const { signInAttempts } = await loginWithDedicatedTestAccount(page, "second");
  await page.goto("/answer-review?mode=second", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  const answerReviewMain = page.locator('main#answer-review-main[data-s232e3-answer-review-entry="learner-first"]');
  const pageRoot = answerReviewMain.locator('[data-s224v-surface="/answer-review?mode=second"]');
  const primarySurface = pageRoot.locator("[data-s232e3-answer-review-primary]");
  await expect(primarySurface).toBeVisible({ timeout: 20_000 });

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
    Object.defineProperty(window, "__s232e3AnswerReviewDocumentIdentity", {
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
        (window as Window & { __s232e3AnswerReviewDocumentIdentity?: string })
          .__s232e3AnswerReviewDocumentIdentity === expectedIdentity,
      documentIdentity,
    );
    resizedSameDocumentVerified =
      resizedSameDocumentVerified && sameDocument && mainFrameDocumentNavigationRequestCount === 0;
    expect(sameDocument, `The ${viewport.label}px check must use the authenticated Answer Review document.`).toBe(true);
    expect(mainFrameDocumentNavigationRequestCount).toBe(0);

    const heading = primarySurface.locator("h1#s232e3-answer-review-title.v3-type-screen");
    const context = primarySurface.locator("dl[data-s232e3-answer-review-context]");
    const contextDefinitions = context.locator(":scope > div");
    const defaultEntryActions = primarySurface.locator("[data-s232e3-answer-entry-actions]");
    const defaultEntryButtons = defaultEntryActions.locator(":scope > button");
    const requiredSurface = primarySurface.locator("[data-s232e3-answer-required]");
    const requiredAnswer = requiredSurface.locator('[data-testid="answer-review-my-answer-input"]');
    const primaryStart = primarySurface.locator("[data-s232e3-answer-review-start]");
    const optionalAccuracy = primarySurface.locator("details[data-s232e3-answer-review-optional]");
    const optionalSummary = optionalAccuracy.locator(":scope > summary");
    const optionalInputs = optionalAccuracy.locator("input, textarea, select");

    await expect(answerReviewMain).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(pageRoot).toHaveCount(1);
    await expect(primarySurface).toHaveCount(1);
    await expect(primarySurface).toHaveAttribute("aria-labelledby", "s232e3-answer-review-title");
    await expect(heading).toHaveCount(1);
    await expect(answerReviewMain.locator("h1")).toHaveCount(1);
    await expect(context).toHaveCount(1);
    await expect(context.locator("dt")).toHaveCount(3);
    await expect(context.locator("dd")).toHaveCount(3);
    await expect(contextDefinitions).toHaveCount(3);
    const contextOrder = await context.evaluate((element) =>
      Array.from(element.querySelectorAll(":scope > [data-s232e3-stage]")).map((node) =>
        node.getAttribute("data-s232e3-stage"),
      ),
    );
    expect(contextOrder).toEqual(["now", "why", "result"]);

    await expect(defaultEntryActions).toHaveCount(1);
    await expect(defaultEntryButtons).toHaveCount(2);
    await expect(defaultEntryButtons.nth(0)).toHaveText("답안 스냅");
    await expect(defaultEntryButtons.nth(1)).toHaveText("텍스트 붙여넣기");
    await expect(defaultEntryButtons.nth(0)).toBeVisible();
    await expect(defaultEntryButtons.nth(1)).toBeVisible();
    await expect(requiredSurface).toHaveCount(1);
    await expect(requiredAnswer).toHaveCount(1);
    await expect(requiredAnswer).toBeVisible();
    await expect(requiredAnswer).toHaveValue("");
    await expect(primaryStart).toHaveCount(1);
    await expect(primaryStart).toBeVisible();
    await expect(primaryStart).toBeDisabled();

    await expect(optionalAccuracy).toHaveCount(1);
    await expect(optionalAccuracy).not.toHaveAttribute("open", "");
    expect(await optionalInputs.count(), "The optional accuracy disclosure must retain its inputs.").toBeGreaterThan(0);
    expect(
      await optionalInputs.evaluateAll((elements) =>
        elements.every((element) => !element.checkVisibility()),
      ),
      "Optional accuracy inputs must remain hidden while their disclosure is closed.",
    ).toBe(true);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${viewport.label}px must not overflow horizontally.`).toBeLessThanOrEqual(1);

    if (index === 0) {
      await resetKeyboardStart(page);
      const entryActionBaseline = await readFocusStyle(defaultEntryButtons.nth(0));
      await tabUntilFocused(
        page,
        defaultEntryButtons.nth(0),
        entryActionBaseline,
        80,
        "Tab must reach the first default Answer Review entry action.",
      );

      await resetKeyboardStart(page);
      const answerBaseline = await readFocusStyle(requiredAnswer);
      await tabUntilFocused(
        page,
        requiredAnswer,
        answerBaseline,
        100,
        "Tab must reach the required answer input without entering learner text.",
      );
      await expect(requiredAnswer).toHaveValue("");

      await resetKeyboardStart(page);
      const summaryBaseline = await readFocusStyle(optionalSummary);
      await tabUntilFocused(
        page,
        optionalSummary,
        summaryBaseline,
        120,
        "Tab must reach the optional accuracy disclosure.",
      );
      await page.keyboard.press("Enter");
      await expect(optionalAccuracy).toHaveAttribute("open", "");
      await page.keyboard.press("Enter");
      await expect(optionalAccuracy).not.toHaveAttribute("open", "");
      await expect(requiredAnswer).toHaveValue("");
      keyboardFocusVerified = true;
      localDisclosureInteractionVerified = true;
    }

    const accessibility = await new AxeBuilder({ page })
      .include("main#answer-review-main")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const blocking = accessibility.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    axeBlockingCount += blocking.length;
    expect(blocking, `${viewport.label}px Axe serious/critical violations`).toEqual([]);
  }

  await expect(primarySurface.locator('[data-testid="answer-review-my-answer-input"]')).toHaveValue("");
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
    stageDefinitionCount: 3,
    stageOrderVerified: true,
    defaultEntryActionCount: 2,
    requiredAnswerInputCount: 1,
    primaryStartActionCount: 1,
    primaryStartDisabledVerified: true,
    optionalDisclosureCount: 1,
    optionalDisclosureClosedVerified: true,
    optionalInputsHiddenVerified: true,
    v3RoleClassesPresent: true,
    keyboardFocusVerified,
    learnerTextEntered: false,
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
    questionTextCaptured: false,
    referenceTextCaptured: false,
    subjectCaptured: false,
    urlCaptured: false,
    emailCaptured: false,
    domCaptured: false,
    screenshotCaptured: false,
    traceCaptured: false,
    videoCaptured: false,
  };

  await writeFile(testInfo.outputPath("s232e3-runtime.json"), JSON.stringify(evidence, null, 2), "utf8");
});
