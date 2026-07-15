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

const runtimeEnabled = process.env.S232E4_AUTH_RUNTIME === "1";

const viewports = [
  { label: "390", width: 390, height: 844 },
  { label: "768", width: 768, height: 1024 },
  { label: "1440", width: 1440, height: 1024 },
] as const;

const readOnlyMethods = new Set(["GET", "HEAD", "OPTIONS"]);

test.use({ screenshot: "off", trace: "off", video: "off" });
test.skip(!runtimeEnabled, "Set S232E4_AUTH_RUNTIME=1 for exact-head Answer Review continuation acceptance.");
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

test("S232E.4 exact-head Answer Review continuation keeps one gap and one rewrite path", async ({ page }, testInfo: TestInfo) => {
  requireSafeAuthenticatedRuntime("S232E.4", {
    requireTargetSha: true,
    requireExactHead: true,
  });

  await page.setViewportSize({ width: viewports[0].width, height: viewports[0].height });
  await establishProtectedPreviewSession(page, "S232E.4");
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
    Object.defineProperty(window, "__s232e4AnswerReviewDocumentIdentity", {
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
            learningSignalStatus: "skipped",
            referenceGrounding: { used: false, displayLabel: "", references: [] },
          }),
        });
        return;
      }
      if (mockedStructureRequestCount === 2) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            error: "Synthetic retry is unavailable.",
            errorCode: "BILLING_REQUIRED",
          }),
        });
        return;
      }

      serverMutationRequestCount += 1;
      await route.abort("blockedbyclient");
      throw new Error("S232E.4 blocked an unexpected extra structure request.");
    }

    if (!readOnlyMethods.has(request.method())) {
      serverMutationRequestCount += 1;
      await route.abort("blockedbyclient");
      throw new Error("S232E.4 blocked an unexpected non-read network request.");
    }

    await route.continue();
  });

  const entryActions = primarySurface.locator('[data-s232e4-entry-actions-scoped="step-1"]');
  const requiredAnswer = primarySurface.getByTestId("answer-review-my-answer-input");
  const start = primarySurface.getByTestId("answer-review-start");
  await expect(entryActions).toHaveCount(1);
  await expect(requiredAnswer).toBeVisible();
  await requiredAnswer.fill("브라우저 전용 합성 답안입니다. 쟁점, 기준, 적용, 결론 순서를 확인합니다.");
  await expect(start).toBeEnabled();
  await start.click();

  const resultSurface = primarySurface.locator('[data-s232e4-answer-review-result="one-gap-first"]');
  const biggestGap = resultSurface.locator("[data-s232e4-biggest-gap]");
  const rewriteEntry = resultSurface.locator("[data-s232e4-rewrite-entry]");
  const statusEvidence = primarySurface.locator("details[data-s232e4-result-status-evidence]");
  const resultSecondary = primarySurface.locator("details[data-s232e4-result-secondary]");
  const fullDiagnostics = primarySurface.locator("details[data-s232e4-full-diagnostics]");
  await expect(resultSurface.getByRole("heading", { name: "가장 큰 간극부터 확인", level: 2 })).toBeFocused();

  let resizedSameDocumentVerified = true;
  let resultKeyboardFocusVerified = false;
  let rewriteKeyboardFocusVerified = false;
  let quietDisclosureVerified = false;
  let axeBlockingCount = 0;

  for (const [index, viewport] of viewports.entries()) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const sameDocument = await page.evaluate(
      (expectedIdentity) =>
        (window as Window & { __s232e4AnswerReviewDocumentIdentity?: string })
          .__s232e4AnswerReviewDocumentIdentity === expectedIdentity,
      documentIdentity,
    );
    resizedSameDocumentVerified =
      resizedSameDocumentVerified && sameDocument && mainFrameDocumentNavigationRequestCount === 0;
    expect(sameDocument, `${viewport.label}px result must reuse the authenticated document.`).toBe(true);
    expect(mainFrameDocumentNavigationRequestCount).toBe(0);

    await expect(entryActions).toHaveCount(0);
    await expect(resultSurface).toHaveCount(1);
    await expect(biggestGap).toHaveCount(1);
    await expect(biggestGap).toBeVisible();
    await expect(rewriteEntry).toHaveCount(1);
    await expect(rewriteEntry).toBeVisible();
    await expect(primarySurface.getByTestId("answer-review-build-feedback")).toHaveCount(1);
    await expect(statusEvidence).not.toHaveAttribute("open", "");
    await expect(resultSecondary).not.toHaveAttribute("open", "");
    await expect(fullDiagnostics).not.toHaveAttribute("open", "");
    expect(
      await resultSecondary.locator("button, a, input, textarea, select").evaluateAll((elements) =>
        elements.every((element) => !element.checkVisibility()),
      ),
      "Secondary result controls must stay hidden while the disclosure is closed.",
    ).toBe(true);

    await expectNoHorizontalOverflow(page, `${viewport.label}px result`);
    axeBlockingCount += await scanAccessibility(page, `${viewport.label}px result`);

    if (index === 0) {
      const reviseInput = primarySurface.getByRole("button", { name: "입력 수정하기", exact: true });
      await resetKeyboardStart(page);
      await tabUntilFocused(page, reviseInput, await readFocusStyle(reviseInput), 120, "Tab must reach input revision.");
      await resetKeyboardStart(page);
      await tabUntilFocused(page, rewriteEntry, await readFocusStyle(rewriteEntry), 140, "Tab must reach the one rewrite CTA.");
      const statusSummary = statusEvidence.locator(":scope > summary");
      await resetKeyboardStart(page);
      await tabUntilFocused(page, statusSummary, await readFocusStyle(statusSummary), 160, "Tab must reach quiet status evidence.");
      await page.keyboard.press("Enter");
      await expect(statusEvidence).toHaveAttribute("open", "");
      await page.keyboard.press("Enter");
      await expect(statusEvidence).not.toHaveAttribute("open", "");
      resultKeyboardFocusVerified = true;
      quietDisclosureVerified = true;
    }
  }

  await page.setViewportSize({ width: viewports[0].width, height: viewports[0].height });
  await rewriteEntry.click();
  const rewriteStage = primarySurface.locator('[data-s232e4-answer-review-rewrite="single-paragraph"]');
  const rewriteSurface = rewriteStage.locator("[data-s232e4-rewrite-surface]");
  const rewriteEditor = rewriteSurface.getByTestId("answer-review-revision-input");
  const copyAction = rewriteSurface.getByTestId("answer-review-copy-feedback");
  const continueAction = rewriteSurface.locator("[data-s232e4-answer-review-continue]");
  const copyOrContinue = rewriteSurface.locator("[data-s232e4-copy-or-continue]");
  const rewriteGuidance = rewriteStage.locator("details[data-s232e4-rewrite-guidance]");
  const rewriteDetails = rewriteStage.locator("details[data-s232e4-rewrite-details]");

  await expect(rewriteStage.getByRole("heading", { name: "보강 문단 정리", level: 2 })).toBeFocused();
  await expect(entryActions).toHaveCount(0);
  await expect(rewriteStage).toHaveCount(1);
  await expect(rewriteSurface).toHaveCount(1);
  await expect(rewriteEditor).toHaveCount(1);
  await expect(rewriteEditor).toBeVisible();
  await expect(rewriteEditor).not.toHaveValue("");
  await expect(copyOrContinue.locator(":scope > button")).toHaveCount(1);
  await expect(copyOrContinue.locator(":scope > a")).toHaveCount(1);
  await expect(copyAction).toHaveText("정리 내용 복사");
  await expect(continueAction).toHaveText("오늘 학습으로 계속");
  await expect(rewriteGuidance).not.toHaveAttribute("open", "");
  await expect(rewriteDetails).not.toHaveAttribute("open", "");

  await resetKeyboardStart(page);
  await tabUntilFocused(page, rewriteEditor, await readFocusStyle(rewriteEditor), 160, "Tab must reach the rewrite editor.");
  await resetKeyboardStart(page);
  await tabUntilFocused(page, copyAction, await readFocusStyle(copyAction), 180, "Tab must reach the copy action.");
  await resetKeyboardStart(page);
  await tabUntilFocused(page, continueAction, await readFocusStyle(continueAction), 200, "Tab must reach the continuation link.");
  rewriteKeyboardFocusVerified = true;

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expect(rewriteStage).toBeVisible();
    await expectNoHorizontalOverflow(page, `${viewport.label}px rewrite`);
    axeBlockingCount += await scanAccessibility(page, `${viewport.label}px rewrite`);
  }

  await page.setViewportSize({ width: viewports[0].width, height: viewports[0].height });
  await rewriteStage.getByRole("button", { name: "검토 결과로 돌아가기", exact: true }).click();
  await resultSurface.getByRole("button", { name: "입력 수정하기", exact: true }).click();
  await expect(requiredAnswer).toBeVisible();
  await expect(start).toBeEnabled();
  await start.click();

  const failedRetryError = primarySurface.getByText(
    "Synthetic retry is unavailable. (업그레이드 또는 지원팀 문의)",
    { exact: true },
  );
  await expect(failedRetryError).toBeVisible();
  await expect(biggestGap).toHaveCount(0);
  await expect(primarySurface.getByTestId("answer-review-build-feedback")).toHaveCount(0);
  await expect(statusEvidence).toHaveCount(0);
  await expect(resultSecondary).toHaveCount(0);
  const staleResultClearedOnFailedRetry =
    (await biggestGap.count()) === 0 &&
    (await primarySurface.getByTestId("answer-review-build-feedback").count()) === 0 &&
    (await statusEvidence.count()) === 0 &&
    (await resultSecondary.count()) === 0;
  expect(staleResultClearedOnFailedRetry).toBe(true);

  const observedAfter = await readObservedDeploymentSha(page);
  expect(observedAfter).toEqual(observedBefore);
  const storageAfter = await readBrowserStorageDigest(page);
  const analyticsAfter = await readAnalyticsLengths(page);
  expect(storageAfter).toBe(storageBefore);
  expect(analyticsAfter).toEqual(analyticsBefore);
  expect(mockedStructureRequestCount).toBe(2);
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
    entryActionsHiddenAfterStart: true,
    biggestGapSurfaceCount: 1,
    rewriteEntryActionCount: 1,
    resultSecondaryClosedVerified: true,
    resultKeyboardFocusVerified,
    rewriteSurfaceCount: 1,
    rewriteEditorCount: 1,
    copyActionCount: 1,
    continuationActionCount: 1,
    rewriteSecondaryClosedVerified: true,
    rewriteKeyboardFocusVerified,
    quietDisclosureVerified,
    syntheticFixtureEntered: true,
    mockedStructureRequestCount,
    staleResultClearedOnFailedRetry,
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

  await writeFile(testInfo.outputPath("s232e4-runtime.json"), JSON.stringify(evidence, null, 2), "utf8");
});
