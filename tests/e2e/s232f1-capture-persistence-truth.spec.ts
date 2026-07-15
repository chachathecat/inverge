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

const runtimeEnabled = process.env.S232F1_AUTH_RUNTIME === "1";
const viewports = [
  { label: "390", width: 390, height: 844 },
  { label: "1440", width: 1440, height: 1024 },
] as const;
const readOnlyMethods = new Set(["GET", "HEAD", "OPTIONS"]);

test.use({ screenshot: "off", trace: "off", video: "off" });
test.skip(!runtimeEnabled, "Set S232F1_AUTH_RUNTIME=1 for exact-head Capture persistence acceptance.");
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

async function readStorageDigest(page: Page) {
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
    const bytes = new TextEncoder().encode(
      `${serialize(window.localStorage)}\u0000${serialize(window.sessionStorage)}`,
    );
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (value) =>
      value.toString(16).padStart(2, "0"),
    ).join("");
  });
}

async function readAnalyticsLengths(page: Page) {
  return page.evaluate(() => {
    const target = window as Window & { dataLayer?: unknown; invergeDataLayer?: unknown };
    return {
      dataLayer: Array.isArray(target.dataLayer) ? target.dataLayer.length : 0,
      invergeDataLayer: Array.isArray(target.invergeDataLayer)
        ? target.invergeDataLayer.length
        : 0,
    };
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

async function tabUntilFocused(page: Page, target: Locator, maxSteps: number) {
  const before = await readFocusStyle(target);
  let reached = false;
  for (let step = 0; step < maxSteps; step += 1) {
    await page.keyboard.press("Tab");
    reached = await target.evaluate((element) => element === document.activeElement);
    if (reached) break;
  }
  expect(reached, "Tab must reach the single recovery action.").toBe(true);
  const after = await readFocusStyle(target);
  expect(after.focusVisible).toBe(true);
  expect(
    after.outline !== before.outline ||
      after.boxShadow !== before.boxShadow ||
      after.borderColor !== before.borderColor ||
      after.backgroundColor !== before.backgroundColor,
    "The recovery action must expose computed focus feedback.",
  ).toBe(true);
}

test("S232F.1 exact-head Capture failure is memory-only, recoverable, and never a success panel", async ({ page }, testInfo: TestInfo) => {
  requireSafeAuthenticatedRuntime("S232F.1", {
    requireTargetSha: true,
    requireExactHead: true,
  });

  await page.setViewportSize(viewports[0]);
  await establishProtectedPreviewSession(page, "S232F.1");
  const runtimeErrors = monitorRuntimeErrors(page);
  const { signInAttempts } = await loginWithDedicatedTestAccount(page, "first");
  await page.goto("/app/capture?mode=first", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  const pageRoot = page.locator('[data-s224v-surface="/app/capture"]');
  const captureForm = pageRoot.locator('form[data-s232e-capture-flow="four-stage"]');
  const learnerInput = captureForm.getByLabel("오늘 공부한 내용 또는 내 답안");
  const quickSave = captureForm.getByRole("button", { name: "빠르게 저장" });
  await expect(pageRoot).toHaveCount(1);
  await expect(captureForm).toHaveCount(1);
  await expect(pageRoot.locator("h1#capture-page-title")).toHaveCount(1);
  await expect(learnerInput).toBeVisible();

  const observedBefore = await readObservedDeploymentSha(page);
  expect(observedBefore).toEqual({
    status: 200,
    ready: true,
    deploymentSha: runtimeTargetSha,
  });

  const documentIdentity = await page.evaluate(() => {
    const value = crypto.randomUUID();
    Object.defineProperty(window, "__s232f1DocumentIdentity", {
      value,
      configurable: false,
      enumerable: false,
      writable: false,
    });
    return value;
  });
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

  const storageBefore = await readStorageDigest(page);
  const analyticsBefore = await readAnalyticsLengths(page);
  await page.evaluate(() => {
    const runtimeWindow = window as Window & {
      __s232f1StorageWriteAttempts?: number;
      __s232f1OriginalStorageSetItem?: Storage["setItem"];
    };
    Object.defineProperty(runtimeWindow, "__s232f1StorageWriteAttempts", {
      value: 0,
      configurable: true,
      enumerable: false,
      writable: true,
    });
    Object.defineProperty(runtimeWindow, "__s232f1OriginalStorageSetItem", {
      value: Storage.prototype.setItem,
      configurable: true,
      enumerable: false,
      writable: false,
    });
    Storage.prototype.setItem = function blockedPersistenceWrite() {
      runtimeWindow.__s232f1StorageWriteAttempts =
        (runtimeWindow.__s232f1StorageWriteAttempts ?? 0) + 1;
      throw new DOMException("Synthetic storage write rejection", "QuotaExceededError");
    };
  });

  const runtimeOrigin = new URL(runtimeBaseUrl).origin;
  let interceptedSaveRequestCount = 0;
  let serverMutationRequestCount = 0;
  let releaseSyntheticFailure = () => {};
  const syntheticFailureGate = new Promise<void>((resolve) => {
    releaseSyntheticFailure = resolve;
  });

  await page.context().route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      url.origin === runtimeOrigin &&
      url.pathname === "/api/os/items" &&
      request.method() === "POST"
    ) {
      interceptedSaveRequestCount += 1;
      await syntheticFailureGate;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "synthetic-runtime-save-failure" }),
      });
      return;
    }
    if (url.origin === runtimeOrigin && !readOnlyMethods.has(request.method())) {
      serverMutationRequestCount += 1;
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });

  const learnerMemoryProbe = "S232F1 memory-only retry probe";
  await learnerInput.fill(learnerMemoryProbe);
  await expect(learnerInput).toHaveValue(learnerMemoryProbe);
  await expect(quickSave).toBeEnabled();
  await quickSave.click();

  const savingState = captureForm.locator('[data-capture-persistence-state="saving"]');
  await expect(savingState).toBeVisible();
  await expect(savingState).toContainText("작업 메모리에 남아 있으며");
  await expect(savingState).toContainText("저장 완료 영수증은 아직 확인되지 않았습니다");
  const lockedWorkSurface = captureForm.locator('[data-capture-work-lock="locked"]');
  await expect(lockedWorkSurface).toHaveCount(1);
  await expect(learnerInput).toBeDisabled();
  await expect(
    lockedWorkSurface.locator("button:enabled, input:enabled, textarea:enabled, select:enabled"),
  ).toHaveCount(0);
  await expect(captureForm.getByText("다른 작업", { exact: true })).toHaveCount(0);
  releaseSyntheticFailure();

  const failureShell = captureForm.locator("[data-capture-persistence-failure]");
  const errorState = failureShell.getByTestId("capture-persistence-error-state");
  const retryAction = errorState.getByRole("button", { name: "입력 확인 후 다시 저장하기" });
  await expect(failureShell).toBeVisible();
  await expect(errorState).toHaveAttribute("data-v3-system-state", "error");
  await expect(errorState).toHaveAttribute("data-failure-aware-safety", "memory_only");
  await expect(errorState).toHaveAttribute("data-failure-aware-auto-sync", "none");
  await expect(failureShell).toHaveAttribute("data-capture-receipt-bound", "false");
  await expect(errorState.getByRole("button")).toHaveCount(1);
  await expect(captureForm.locator("[data-capture-plan-reflection-stage]")).toHaveCount(0);
  await expect(captureForm.locator('[data-v3-system-state="completed"]')).toHaveCount(0);
  await expect(captureForm.getByText("오늘 계획에 반영", { exact: true })).toHaveCount(0);
  await expect(captureForm.getByText("복습에 남길 내용", { exact: true })).toHaveCount(0);
  await expect(captureForm.getByRole("link", { name: "오늘 할 일로 이동" })).toHaveCount(0);

  const identifierExposureCount = await errorState.evaluate((element) => {
    const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
    return (element.outerHTML.match(uuid) ?? []).length;
  });
  expect(identifierExposureCount).toBe(0);

  let axeBlockingCount = 0;
  let resizedSameDocumentVerified = true;
  for (const [index, viewport] of viewports.entries()) {
    if (index > 0) await page.setViewportSize(viewport);
    const sameDocument = await page.evaluate(
      (expected) =>
        (window as Window & { __s232f1DocumentIdentity?: string }).__s232f1DocumentIdentity === expected,
      documentIdentity,
    );
    resizedSameDocumentVerified =
      resizedSameDocumentVerified && sameDocument && mainFrameDocumentNavigationRequestCount === 0;
    expect(sameDocument, `${viewport.label}px must use the same authenticated document.`).toBe(true);
    expect(mainFrameDocumentNavigationRequestCount).toBe(0);
    await expect(failureShell).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${viewport.label}px must not overflow horizontally.`).toBeLessThanOrEqual(1);

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

  await retryAction.focus();
  await page.keyboard.press("Shift+Tab");
  await tabUntilFocused(page, retryAction, 3);
  await page.keyboard.press("Enter");
  await expect(failureShell).toHaveCount(0);
  await expect(learnerInput).toBeVisible();
  await expect(learnerInput).toBeEnabled();
  await expect(learnerInput).toHaveValue(learnerMemoryProbe);
  await expect(quickSave).toBeEnabled();

  const storageAfter = await readStorageDigest(page);
  const analyticsAfter = await readAnalyticsLengths(page);
  const storageWriteAttemptCount = await page.evaluate(
    () => (window as Window & { __s232f1StorageWriteAttempts?: number }).__s232f1StorageWriteAttempts ?? 0,
  );
  const observedAfter = await readObservedDeploymentSha(page);

  expect(observedAfter).toEqual(observedBefore);
  expect(storageAfter).toBe(storageBefore);
  expect(analyticsAfter).toEqual(analyticsBefore);
  expect(interceptedSaveRequestCount).toBe(1);
  expect(serverMutationRequestCount).toBe(0);
  expect(storageWriteAttemptCount).toBeGreaterThanOrEqual(2);
  const expectedSyntheticFailureResponseCount = runtimeErrors.sameOriginRequestFailures.filter(
    (failure) => failure === "POST /api/os/items HTTP 503",
  ).length;
  const unexpectedSameOriginFailures = runtimeErrors.sameOriginRequestFailures.filter(
    (failure) => failure !== "POST /api/os/items HTTP 503",
  );
  expect(expectedSyntheticFailureResponseCount).toBe(1);
  expect(runtimeErrors.consoleErrors).toEqual([]);
  expect(runtimeErrors.pageErrors).toEqual([]);
  expect(unexpectedSameOriginFailures).toEqual([]);

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
    failureStateCount: 1,
    memoryOnlySafetyVerified: true,
    loadingTruthVerified: true,
    inFlightEditingLockedVerified: true,
    noPlanCandidateVerified: true,
    noCompletedStateVerified: true,
    oneRetryActionVerified: true,
    inputRetainedAfterRetryVerified: true,
    retryFocusVerified: true,
    responsiveOverflowVerified: true,
    axeBlockingCount,
    interceptedSaveRequestCount,
    expectedSyntheticFailureResponseCount,
    serverMutationRequestCount,
    storageWriteAttemptCount,
    browserStorageMutationCount: storageAfter === storageBefore ? 0 : 1,
    analyticsEventDelta:
      analyticsAfter.dataLayer - analyticsBefore.dataLayer +
      analyticsAfter.invergeDataLayer - analyticsBefore.invergeDataLayer,
    autoSyncClaimCount: 0,
    identifierExposureCount,
    consoleErrorCount: runtimeErrors.consoleErrors.length,
    pageErrorCount: runtimeErrors.pageErrors.length,
    sameOriginRequestFailureCount: unexpectedSameOriginFailures.length,
    globalDatabaseImmutabilityClaimed: false,
    credentialsCaptured: false,
    rawLearnerContentCaptured: false,
    referenceTextCaptured: false,
    answerTextCaptured: false,
    subjectCaptured: false,
    urlCaptured: false,
    emailCaptured: false,
    operationIdCaptured: false,
    workRevisionIdCaptured: false,
    recordIdCaptured: false,
    domCaptured: false,
    screenshotCaptured: false,
    traceCaptured: false,
    videoCaptured: false,
  };

  await writeFile(
    testInfo.outputPath("s232f1-runtime.json"),
    JSON.stringify(evidence, null, 2),
    "utf8",
  );
});
