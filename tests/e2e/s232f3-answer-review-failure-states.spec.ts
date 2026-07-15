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

const runtimeEnabled = process.env.S232F3_AUTH_RUNTIME === "1";
const readOnlyMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const viewports = [
  { label: "390", width: 390, height: 844 },
  { label: "768", width: 768, height: 1024 },
  { label: "1440", width: 1440, height: 1024 },
] as const;

test.use({ screenshot: "off", trace: "off", video: "off" });
test.skip(!runtimeEnabled, "Set S232F3_AUTH_RUNTIME=1 for exact-head Answer Review failure-state acceptance.");
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
    const runtimeWindow = window as Window & { dataLayer?: unknown; invergeDataLayer?: unknown };
    return {
      dataLayer: Array.isArray(runtimeWindow.dataLayer) ? runtimeWindow.dataLayer.length : 0,
      invergeDataLayer: Array.isArray(runtimeWindow.invergeDataLayer)
        ? runtimeWindow.invergeDataLayer.length
        : 0,
    };
  });
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${label} must not overflow horizontally.`).toBeLessThanOrEqual(1);
}

async function scanAccessibility(page: Page, label: string) {
  const accessibility = await new AxeBuilder({ page })
    .include("main#answer-review-main")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = accessibility.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(blocking, `${label} Axe serious/critical violations`).toEqual([]);
  return blocking.length;
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

async function waitForReactHandler(
  locator: Locator,
  eventName: "onChange" | "onClick",
  controlName: string,
) {
  await expect(locator).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(
      () =>
        locator.evaluate((element, expectedEventName) => {
          const reactPropsKey = Object.keys(element).find((key) => key.startsWith("__reactProps$"));
          if (!reactPropsKey) return false;
          const reactProps = (
            element as unknown as Record<string, Record<string, unknown> | undefined>
          )[reactPropsKey];
          return typeof reactProps?.[expectedEventName] === "function";
        }, eventName),
      {
        timeout: 20_000,
        message: `${controlName} must have its React ${eventName} handler before interaction.`,
      },
    )
    .toBe(true);
}

async function tabUntilFocused(page: Page, target: Locator, controlName: string, maxSteps: number) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  const before = await readFocusStyle(target);
  let reached = false;
  for (let step = 0; step < maxSteps; step += 1) {
    await page.keyboard.press("Tab");
    reached = await target.evaluate((element) => element === document.activeElement);
    if (reached) break;
  }
  expect(reached, `Tab must reach ${controlName}.`).toBe(true);
  const after = await readFocusStyle(target);
  expect(after.focusVisible).toBe(true);
  expect(
    before.outline !== after.outline ||
      before.boxShadow !== after.boxShadow ||
      before.borderColor !== after.borderColor ||
      before.backgroundColor !== after.backgroundColor,
    `${controlName} must expose a computed focus-style delta.`,
  ).toBe(true);
}

test("S232F.3 exact-head Answer Review keeps failures evidence-bound", async ({ page }, testInfo: TestInfo) => {
  requireSafeAuthenticatedRuntime("S232F.3", {
    requireTargetSha: true,
    requireExactHead: true,
  });

  await page.setViewportSize({ width: viewports[0].width, height: viewports[0].height });
  await establishProtectedPreviewSession(page, "S232F.3");
  const runtimeErrors = monitorRuntimeErrors(page);
  const { signInAttempts } = await loginWithDedicatedTestAccount(page, "second");
  await page.goto("/answer-review?mode=second", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  const answerReviewMain = page.locator('main#answer-review-main[data-s232e3-answer-review-entry="learner-first"]');
  const primarySurface = answerReviewMain.locator("[data-s232e3-answer-review-primary]");
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
    Object.defineProperty(window, "__s232f3AnswerReviewDocumentIdentity", {
      value: identity,
      configurable: false,
      enumerable: false,
      writable: false,
    });
    return identity;
  });

  const observedBefore = await readObservedDeploymentSha(page);
  expect(observedBefore).toEqual({ status: 200, ready: true, deploymentSha: runtimeTargetSha });
  const storageBefore = await readBrowserStorageDigest(page);
  const analyticsBefore = await readAnalyticsLengths(page);
  const runtimeOrigin = new URL(runtimeBaseUrl).origin;
  const structurePathname = "/api/answer-review/structure";
  let mockedStructureRequestCount = 0;
  let serverMutationRequestCount = 0;
  let negativeAckStatus = 0;
  let releaseNegativeAck = () => {
    throw new Error("S232F.3 negative acknowledgement release was not initialized.");
  };
  const negativeAckGate = new Promise<void>((resolve) => {
    releaseNegativeAck = resolve;
  });

  await page.context().route("**/*", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    const isSyntheticStructureRequest =
      requestUrl.origin === runtimeOrigin &&
      requestUrl.pathname === structurePathname &&
      requestUrl.search === "" &&
      requestUrl.hash === "" &&
      request.method() === "POST" &&
      request.resourceType() === "fetch";

    if (isSyntheticStructureRequest) {
      mockedStructureRequestCount += 1;
      if (mockedStructureRequestCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            draft: {
              questionSummary: "synthetic browser-only requirement",
              coreConcepts: ["synthetic issue", "synthetic standard"],
              strengths: ["synthetic structure strength"],
              missingIssueCandidates: ["synthetic biggest gap"],
              requiredIssues: "synthetic required issue",
              userAnswerStructure: "synthetic issue to conclusion",
              referenceStructure: "synthetic reference structure",
              weakLogicPoint: "synthetic reasoning gap",
              weakParagraphPoint: "synthetic paragraph gap",
              rewriteTarget: "synthetic one-paragraph target",
              rewriteDraftSuggestion: "synthetic browser-only rewrite suggestion",
              nextAction: "synthetic one-paragraph rewrite instruction",
              caution: "synthetic review caution",
            },
            learningSignalStatus: "failed",
            referenceGrounding: { used: false, displayLabel: "", references: [] },
          }),
        });
        return;
      }
      if (mockedStructureRequestCount === 2) {
        await negativeAckGate;
        negativeAckStatus = 200;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            error: "Synthetic structure acknowledgement was negative.",
            errorCode: "STRUCTURE_UNAVAILABLE",
          }),
        });
        return;
      }
      if (mockedStructureRequestCount === 3) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            error: "Synthetic payload says to retry, but the UI must ignore this text.",
            errorCode: "CORE_LIMIT_REACHED",
          }),
        });
        return;
      }

      serverMutationRequestCount += 1;
      await route.abort("blockedbyclient");
      throw new Error("S232F.3 blocked an unexpected extra structure request.");
    }

    if (!readOnlyMethods.has(request.method())) {
      serverMutationRequestCount += 1;
      await route.abort("blockedbyclient");
      throw new Error("S232F.3 blocked an unexpected non-read network request.");
    }

    await route.continue();
  });

  const requiredAnswer = primarySurface.getByTestId("answer-review-my-answer-input");
  const start = primarySurface.getByTestId("answer-review-start");
  const syntheticAnswer = "브라우저 전용 합성 답안입니다. 쟁점, 기준, 적용, 결론 순서를 확인합니다.";
  await waitForReactHandler(requiredAnswer, "onChange", "Answer Review learner answer");
  await requiredAnswer.fill(syntheticAnswer);
  await expect(start).toBeEnabled();
  await waitForReactHandler(start, "onClick", "Answer Review start action");
  await start.click();

  const successfulResult = primarySurface.locator('[data-s232f3-answer-review-analysis="succeeded"]');
  const biggestGap = primarySurface.locator("[data-s232e4-biggest-gap]");
  const rewriteEntry = primarySurface.locator("[data-s232e4-rewrite-entry]");
  const persistenceWarning = primarySurface.locator(
    '[data-s232f3-answer-review-analysis-status="succeeded"][data-s232f3-learning-signal-status="failed"]',
  );
  await expect(successfulResult).toHaveCount(1);
  await expect(biggestGap).toHaveCount(1);
  await expect(rewriteEntry).toHaveCount(1);
  await expect(persistenceWarning).toBeVisible();

  let resizedSameDocumentVerified = true;
  let axeBlockingCount = 0;
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const sameDocument = await page.evaluate(
      (expectedIdentity) =>
        (window as Window & { __s232f3AnswerReviewDocumentIdentity?: string })
          .__s232f3AnswerReviewDocumentIdentity === expectedIdentity,
      documentIdentity,
    );
    resizedSameDocumentVerified =
      resizedSameDocumentVerified && sameDocument && mainFrameDocumentNavigationRequestCount === 0;
    expect(sameDocument).toBe(true);
    expect(mainFrameDocumentNavigationRequestCount).toBe(0);
    await expect(persistenceWarning).toBeVisible();
    await expect(rewriteEntry).toBeVisible();
    await expectNoHorizontalOverflow(page, `${viewport.label}px partial persistence failure`);
    axeBlockingCount += await scanAccessibility(page, `${viewport.label}px partial persistence failure`);
  }

  await page.setViewportSize({ width: viewports[0].width, height: viewports[0].height });
  await successfulResult.getByRole("button", { name: "입력 수정하기", exact: true }).click();
  await expect(requiredAnswer).toHaveValue(syntheticAnswer);
  await expect(successfulResult).toHaveCount(0);
  await expect(biggestGap).toHaveCount(0);
  await expect(rewriteEntry).toHaveCount(0);
  await waitForReactHandler(requiredAnswer, "onChange", "Remounted Answer Review learner answer");
  await waitForReactHandler(start, "onClick", "Remounted Answer Review start action");
  await start.click();

  const loading = primarySurface.getByTestId("answer-review-structure-loading");
  const entryFieldset = primarySurface.locator('fieldset[data-s232f3-answer-input-lock="locked"]');
  await expect(loading).toBeVisible();
  await expect(loading).toHaveAttribute("data-v3-system-state", "loading");
  await expect(loading).toHaveAttribute("data-failure-aware-safety", "memory_only");
  await expect(loading).toHaveAttribute("data-failure-aware-auto-sync", "none");
  expect(
    await entryFieldset.evaluate(
      (element) => (element as HTMLFieldSetElement).disabled,
    ),
    "The Answer Review input fieldset must expose native disabled semantics while loading.",
  ).toBe(true);
  await expect(requiredAnswer).toBeDisabled();
  await expect(requiredAnswer).toHaveValue(syntheticAnswer);
  await expect(biggestGap).toHaveCount(0);
  await expect(rewriteEntry).toHaveCount(0);
  const loadingClearedPriorResult = (await biggestGap.count()) === 0 && (await rewriteEntry.count()) === 0;

  releaseNegativeAck();
  const error = primarySurface.getByTestId("answer-review-structure-error");
  const retry = error.getByRole("button", { name: "답안 검토 다시 시도", exact: true });
  await expect(error).toBeVisible();
  await expect(error).toHaveAttribute("data-v3-system-state", "error");
  await expect(error).toHaveAttribute("data-failure-aware-safety", "memory_only");
  await expect(error).toHaveAttribute("data-failure-aware-auto-sync", "none");
  await expect(retry).toBeVisible();
  const retryActionCount = await retry.count();
  expect(retryActionCount).toBe(1);
  await expect(biggestGap).toHaveCount(0);
  await expect(rewriteEntry).toHaveCount(0);
  await expect(primarySurface.locator("[data-s232e4-result-status-evidence]")).toHaveCount(0);
  await expect(primarySurface.locator("[data-s232e4-result-secondary]")).toHaveCount(0);
  await expect(primarySurface.locator("[data-s232e4-answer-review-rewrite]")).toHaveCount(0);
  await expect(primarySurface.locator("[data-s232e4-full-diagnostics]")).toHaveCount(0);
  const staleResultAbsentAfterFailure =
    (await biggestGap.count()) === 0 &&
    (await rewriteEntry.count()) === 0 &&
    (await primarySurface.locator("[data-s232e4-result-status-evidence]").count()) === 0 &&
    (await primarySurface.locator("[data-s232e4-result-secondary]").count()) === 0 &&
    (await primarySurface.locator("[data-s232e4-answer-review-rewrite]").count()) === 0 &&
    (await primarySurface.locator("[data-s232e4-full-diagnostics]").count()) === 0;

  let retryKeyboardFocusVerified = false;
  for (const [index, viewport] of viewports.entries()) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expect(error).toBeVisible();
    await expectNoHorizontalOverflow(page, `${viewport.label}px retryable error`);
    axeBlockingCount += await scanAccessibility(page, `${viewport.label}px retryable error`);
    if (index === 0) {
      await tabUntilFocused(page, retry, "the retry action", 180);
      retryKeyboardFocusVerified = true;
    }
  }

  await page.setViewportSize({ width: viewports[0].width, height: viewports[0].height });
  await primarySurface.getByRole("button", { name: "입력 수정하기", exact: true }).click();
  await expect(requiredAnswer).toHaveValue(syntheticAnswer);
  await waitForReactHandler(start, "onClick", "Answer Review start action after retryable failure");
  await start.click();

  const nonRetryableError = primarySurface.getByTestId("answer-review-structure-error");
  const nonRetryableResultShell = primarySurface.locator('[data-s232f3-answer-review-analysis="failed"]');
  const pricingLink = nonRetryableError.getByRole("link", { name: "이용 범위 확인", exact: true });
  const nonRetryableDetail = primarySurface.locator("[data-s232f3-answer-review-error-detail]");
  await expect(nonRetryableError).toBeVisible();
  await expect(nonRetryableError).toHaveAttribute("data-v3-system-state", "error");
  await expect(nonRetryableError).toHaveAttribute("data-failure-aware-safety", "memory_only");
  await expect(nonRetryableError).toHaveAttribute("data-failure-aware-auto-sync", "none");
  await expect(nonRetryableResultShell.getByRole("heading", { name: "답안 검토 이용 범위를 확인해 주세요", exact: true })).toBeVisible();
  await expect(primarySurface.locator('[data-s232f3-answer-review-error="blocked-memory-only"]')).toBeVisible();
  await expect(pricingLink).toBeVisible();
  await expect(nonRetryableError.getByRole("button", { name: "답안 검토 다시 시도", exact: true })).toHaveCount(0);
  await expect(nonRetryableDetail).toContainText("현재 요금제의 답안 검토 이용 범위를 모두 사용했습니다");
  await expect(nonRetryableDetail).not.toContainText("다시 시도");
  await expect(nonRetryableDetail).not.toContainText("Synthetic payload");
  await expect(nonRetryableResultShell).not.toContainText("다시 시도");
  await expect(nonRetryableResultShell).not.toContainText("Synthetic payload");
  await expect(biggestGap).toHaveCount(0);
  await expect(rewriteEntry).toHaveCount(0);

  const nonRetryableLimitStateVerified = await pricingLink.isVisible();
  const nonRetryableLimitRetryActionAbsent =
    (await nonRetryableError.getByRole("button", { name: "답안 검토 다시 시도", exact: true }).count()) === 0;
  const nonRetryableLimitCopyContradictionAbsent =
    !(await nonRetryableResultShell.textContent())?.includes("다시 시도") &&
    !(await nonRetryableResultShell.textContent())?.includes("Synthetic payload");
  let nonRetryableLimitKeyboardFocusVerified = false;
  for (const [index, viewport] of viewports.entries()) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expect(nonRetryableError).toBeVisible();
    await expectNoHorizontalOverflow(page, `${viewport.label}px non-retryable limit error`);
    axeBlockingCount += await scanAccessibility(page, `${viewport.label}px non-retryable limit error`);
    if (index === 0) {
      await tabUntilFocused(page, pricingLink, "the non-retryable recovery action", 180);
      nonRetryableLimitKeyboardFocusVerified = true;
    }
  }

  await page.setViewportSize({ width: viewports[0].width, height: viewports[0].height });
  await primarySurface.getByRole("button", { name: "입력 수정하기", exact: true }).click();
  await expect(requiredAnswer).toHaveValue(syntheticAnswer);
  const learnerAnswerPreservedAfterFailure = (await requiredAnswer.inputValue()) === syntheticAnswer;

  const observedAfter = await readObservedDeploymentSha(page);
  expect(observedAfter).toEqual(observedBefore);
  const storageAfter = await readBrowserStorageDigest(page);
  const analyticsAfter = await readAnalyticsLengths(page);
  expect(storageAfter).toBe(storageBefore);
  expect(analyticsAfter).toEqual(analyticsBefore);
  expect(mockedStructureRequestCount).toBe(3);
  expect(negativeAckStatus).toBe(200);
  expect(serverMutationRequestCount).toBe(0);
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
    syntheticFixtureEntered: true,
    mockedStructureRequestCount,
    successfulAnalysisVisible: true,
    learningSignalFailureDistinguished: true,
    rewriteEntryRetainedForSuccessfulAnalysis: true,
    loadingStateVerified: true,
    loadingMemoryOnlyVerified: true,
    inputLockedDuringLoading: true,
    loadingClearedPriorResult,
    negativeAckHttpStatus: negativeAckStatus,
    errorStateVerified: true,
    errorMemoryOnlyVerified: true,
    retryActionCount,
    retryKeyboardFocusVerified,
    nonRetryableLimitStateVerified,
    nonRetryableLimitRetryActionAbsent,
    nonRetryableLimitKeyboardFocusVerified,
    nonRetryableLimitCopyContradictionAbsent,
    staleResultAbsentAfterFailure,
    learnerAnswerPreservedAfterFailure,
    serverMutationRequestCount,
    browserStorageMutationCount: storageAfter === storageBefore ? 0 : 1,
    analyticsEventDelta:
      analyticsAfter.dataLayer - analyticsBefore.dataLayer +
      analyticsAfter.invergeDataLayer - analyticsBefore.invergeDataLayer,
    responsiveOverflowVerified: true,
    axeBlockingCount,
    consoleErrorCount: runtimeErrors.consoleErrors.length,
    pageErrorCount: runtimeErrors.pageErrors.length,
    sameOriginRequestFailureCount: runtimeErrors.sameOriginRequestFailures.length,
    rawLearnerDataPersisted: false,
    globalDatabaseImmutabilityClaimed: false,
    credentialsCaptured: false,
    rawLearnerContentCaptured: false,
    syntheticFixtureValueCaptured: false,
    requestBodyCaptured: false,
    responseBodyCaptured: false,
    subjectCaptured: false,
    urlCaptured: false,
    emailCaptured: false,
    domCaptured: false,
    screenshotCaptured: false,
    traceCaptured: false,
    videoCaptured: false,
  };

  await writeFile(testInfo.outputPath("s232f3-runtime.json"), JSON.stringify(evidence, null, 2), "utf8");
});
