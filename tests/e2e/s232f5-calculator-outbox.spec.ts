import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";

import {
  establishProtectedPreviewSession,
  loginWithDedicatedTestAccount,
  monitorRuntimeErrors,
  protectionHeaders,
  requireSafeAuthenticatedRuntime,
  runtimeBaseUrl,
  runtimeRunnerSha,
  runtimeTargetSha,
} from "./support/authenticated-runtime";

const runtimeEnabled = process.env.S232F5_AUTH_RUNTIME === "1";
const outboxKey = "inverge.calculatorRoutine.completionOutbox.v1";
const outboxLockName = "inverge-calculator-routine-completion-outbox-v1";
const completionHistoryKey = "inverge.calculatorRoutine.completions.v1";
const draftPrefix = "inverge.calculatorRoutine.draft.v1:";
const originalQueueSessionKey = "s232f5.originalQueueId";
const syntheticForeignUserId = "018f2f4a-7b2c-4d11-8a3f-1234567890ab";
const viewports = [
  { label: "390", width: 390, height: 844 },
  { label: "768", width: 768, height: 1024 },
  { label: "1440", width: 1440, height: 1024 },
] as const;
const stepIds = [
  "conditions",
  "formula",
  "numbers_units",
  "casio_input",
  "display_value",
  "answer_value",
  "unit_rounding",
  "verification",
  "mistake_type",
] as const;
const syntheticEntries: Record<(typeof stepIds)[number], string> = {
  conditions: "합성 조건을 직접 확인했습니다.",
  formula: "합성 산식을 직접 확인했습니다.",
  numbers_units: "합성 숫자와 단위를 직접 확인했습니다.",
  casio_input: "100 × 2 EXE 합성 입력을 확인했습니다.",
  display_value: "합성 화면값을 직접 확인했습니다.",
  answer_value: "합성 기재값을 직접 확인했습니다.",
  unit_rounding: "합성 단위와 반올림을 확인했습니다.",
  verification: "",
  mistake_type: "",
};

test.use({
  extraHTTPHeaders: protectionHeaders,
  screenshot: "off",
  trace: "off",
  video: "off",
});
test.skip(!runtimeEnabled, "Set S232F5_AUTH_RUNTIME=1 for exact-head calculator outbox acceptance.");
test.describe.configure({ timeout: 300_000, retries: 0 });

async function observedDeploymentSha(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/runtime/version", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const body = (await response.json()) as { ready?: boolean; deploymentSha?: string };
    return { status: response.status, ready: body.ready, deploymentSha: body.deploymentSha };
  });
}

async function clearSyntheticCalculatorState(page: Page) {
  await page.evaluate(({ outbox, history, draft, queueKey }) => {
    window.localStorage.removeItem(outbox);
    window.localStorage.removeItem(history);
    window.sessionStorage.removeItem(queueKey);
    for (const key of Object.keys(window.sessionStorage)) {
      if (key.startsWith(draft)) window.sessionStorage.removeItem(key);
    }
  }, {
    outbox: outboxKey,
    history: completionHistoryKey,
    draft: draftPrefix,
    queueKey: originalQueueSessionKey,
  });
}

async function waitForHydratedButton(button: Locator) {
  await expect(button).toBeVisible({ timeout: 20_000 });
  await expect.poll(
    () => button.evaluate((element) =>
      Object.keys(element).some((key) =>
        key.startsWith("__reactProps$") || key.startsWith("__reactFiber$"),
      ),
    ),
    { timeout: 20_000, message: "The calculator control must be hydrated." },
  ).toBe(true);
}

async function completeRoutine(page: Page) {
  const trainer = page.locator("[data-calculator-routine-trainer]");
  await expect(trainer).toHaveCount(1);
  const start = trainer.getByRole("button", { name: /루틴 시작/ });
  await waitForHydratedButton(start);
  await start.click();

  for (const [index, stepId] of stepIds.entries()) {
    const step = trainer.locator(`[data-calculator-routine-active-step="${stepId}"]`);
    await expect(step).toBeVisible();
    if (stepId === "verification") {
      await step.getByLabel("역산", { exact: true }).check();
    } else if (stepId === "mistake_type") {
      await step.getByLabel("실수 없음", { exact: true }).check();
    } else {
      await step.locator("textarea").fill(syntheticEntries[stepId]);
    }
    const next = trainer.getByRole("button", {
      name: index === stepIds.length - 1 ? "계산·검산 루틴 완료" : /^다음 · /,
    });
    await expect(next).toBeEnabled();
    await next.click();
  }
  await expect(trainer).toHaveAttribute("data-calculator-routine-state", "completed");
}

async function outboxProbe(page: Page) {
  return page.evaluate(({ key, forbiddenValues, queueSessionKey }) => {
    const exactKeys = (value: unknown, expected: readonly string[]) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      const actual = Object.keys(value as Record<string, unknown>).sort();
      return JSON.stringify(actual) === JSON.stringify([...expected].sort());
    };
    const raw = window.localStorage.getItem(key);
    let value: unknown = null;
    try {
      value = raw ? JSON.parse(raw) : null;
    } catch {
      value = null;
    }
    const entries = Array.isArray(value) ? value : [];
    const entry = entries[0] as Record<string, unknown> | undefined;
    const signal = entry?.signal as Record<string, unknown> | undefined;
    const concept = signal?.routineConceptCandidate;
    const serialized = JSON.stringify(entries);
    const rememberedQueueId = window.sessionStorage.getItem(queueSessionKey);
    return {
      queueCount: entries.length,
      entryKeySetExact: exactKeys(entry, [
        "accountScope", "autoSyncRegistered", "metadataOnly", "queueId",
        "queuedAt", "queueType", "signal", "version",
      ]),
      signalKeySetExact: exactKeys(signal, [
        "completedAt", "completedStepIds", "examMode", "hintUsedStepIds",
        "metadataOnly", "mistakeTypes", "needsOfficialVerification",
        "primaryMistakeType", "routineConceptCandidate", "routineId",
        "routineType", "source", "sourceStatus", "startedAt", "stuckStepIds",
        "subject", "verificationMethods", "version",
      ]),
      conceptKeySetExact: exactKeys(concept, [
        "conceptFamily", "conceptNodeId", "examMode", "metadataOnly",
        "mistakeType", "needsOfficialVerification", "nextTaskType",
        "retrievalPrompt", "sourceStatus", "subject",
      ]),
      queueIdIsUuid:
        typeof entry?.queueId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entry.queueId),
      queueIdentityPersisted:
        rememberedQueueId !== null && rememberedQueueId === entry?.queueId,
      queuedAtCanonical:
        typeof entry?.queuedAt === "string" &&
        new Date(entry.queuedAt).toISOString() === entry.queuedAt,
      accountScopeIsSha256:
        typeof entry?.accountScope === "string" && /^[0-9a-f]{64}$/.test(entry.accountScope),
      autoSyncRegistered: entry?.autoSyncRegistered === true,
      metadataOnly: entry?.metadataOnly === true && signal?.metadataOnly === true,
      rawFieldAbsent:
        !/(rawAnswer|rawQuestion|rawOcr|entries|verificationMemo|mistakeMemo|sourceText)/i.test(serialized),
      credentialShapeAbsent:
        !/(email|password|cookie|authorization|accessToken|refreshToken)/i.test(serialized),
      learnerEntryValuesAbsent: forbiddenValues
        .filter(Boolean)
        .every((candidate) => !serialized.includes(candidate)),
    };
  }, {
    key: outboxKey,
    forbiddenValues: Object.values(syntheticEntries),
    queueSessionKey: originalQueueSessionKey,
  });
}

async function rememberQueueIdentity(page: Page) {
  await page.evaluate(({ key, queueKey }) => {
    const entries = JSON.parse(window.localStorage.getItem(key) ?? "[]") as Array<{
      queueId?: unknown;
    }>;
    const entry = entries[0];
    if (
      entries.length !== 1 ||
      typeof entry.queueId !== "string"
    ) {
      throw new Error("Expected one calculator outbox entry");
    }
    window.sessionStorage.setItem(queueKey, entry.queueId);
  }, {
    key: outboxKey,
    queueKey: originalQueueSessionKey,
  });
}

async function signalOutboxStorage(page: Page) {
  await page.evaluate((key) => {
    const value = window.localStorage.getItem(key);
    window.dispatchEvent(
      new StorageEvent("storage", { key, oldValue: value, newValue: value }),
    );
  }, outboxKey);
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${label} must not have horizontal overflow.`).toBeLessThanOrEqual(1);
}

function unexpectedInitialConsoleErrors(errors: string[]) {
  const controlledErrors = new Set([
    "Failed to load resource: net::ERR_INTERNET_DISCONNECTED",
    "Failed to load resource: the server responded with a status of 401 (Unauthorized)",
  ]);
  return errors.filter((error) => !controlledErrors.has(error));
}

function expectOnlyControlledInitialConsoleErrors(errors: string[]) {
  expect(
    unexpectedInitialConsoleErrors(errors),
    "Only the deliberately injected Offline and 401 browser messages may reach the console.",
  ).toEqual([]);
}

async function reachByKeyboardTab(page: Page, target: Locator) {
  await page.locator("body").click({ position: { x: 2, y: 2 } });
  for (let index = 0; index < 80; index += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => document.activeElement === element)) return true;
  }
  return false;
}

test("S232F.5 exact-head calculator outbox is account-bound, receipt-bound, and cross-tab single-writer", async ({ page, context }, testInfo: TestInfo) => {
  requireSafeAuthenticatedRuntime("S232F.5", {
    requireTargetSha: true,
    requireExactHead: true,
  });
  const initialErrors = monitorRuntimeErrors(page);
  await page.setViewportSize(viewports[0]);
  await establishProtectedPreviewSession(page, "S232F.5");
  const { signInAttempts } = await loginWithDedicatedTestAccount(page, "second");
  await clearSyntheticCalculatorState(page);

  const runtimeOrigin = new URL(runtimeBaseUrl).origin;
  let interceptedCompletionRequestCount = 0;
  let serverMutationRequestCount = 0;
  let sessionStage: "actual" | "foreign" | "unavailable" = "actual";
  let transportStage: "auth" | "malformed" | "durable" = "auth";
  let releaseDurableReceipt = () => {};
  const durableReceiptGate = new Promise<void>((resolve) => {
    releaseDurableReceipt = resolve;
  });
  let routeInstalled = false;

  try {
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (
        sessionStage === "unavailable" &&
        url.origin === runtimeOrigin &&
        url.pathname === "/api/auth/session" &&
        request.method() === "GET"
      ) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, error: "synthetic-unavailable" }),
        });
        return;
      }
      if (
        sessionStage === "foreign" &&
        url.origin === runtimeOrigin &&
        url.pathname === "/api/auth/session" &&
        request.method() === "GET"
      ) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            session: {
              authEnabled: true,
              isAuthenticated: true,
              isDemo: false,
              userId: syntheticForeignUserId,
              email: null,
              source: "supabase",
            },
          }),
        });
        return;
      }
      if (
        url.origin === runtimeOrigin &&
        url.pathname === "/api/os/calculator-routine/complete" &&
        request.method() === "POST"
      ) {
        interceptedCompletionRequestCount += 1;
        if (transportStage === "auth") {
          await route.fulfill({
            status: 401,
            contentType: "application/json",
            body: JSON.stringify({ ok: false, error: "auth-required" }),
          });
          return;
        }
        if (transportStage === "malformed") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: true, status: "saved" }),
          });
          return;
        }
        await durableReceiptGate;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            status: "deduped",
            learningRecordId: "018f2f4a-7b2c-7d22-9a3f-1234567890ab",
            learningRecordSaved: true,
            deduped: true,
          }),
        });
        return;
      }
      if (
        url.origin === runtimeOrigin &&
        !["GET", "HEAD", "OPTIONS"].includes(request.method())
      ) {
        serverMutationRequestCount += 1;
        await route.abort("blockedbyclient");
        return;
      }
      await route.continue();
    });
    routeInstalled = true;

    await page.goto("/app/calculator?mode=second&context=practice&focus=casio", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await expect(
      page.locator('[data-calculator-routine-account-scope="ready"]'),
    ).toBeVisible({ timeout: 20_000 });
    expect(await observedDeploymentSha(page)).toEqual({
      status: 200,
      ready: true,
      deploymentSha: runtimeTargetSha,
    });

    await context.setOffline(true);
    await completeRoutine(page);

    const offlineState = page.getByTestId("calculator-routine-outbox-offline");
    await expect(offlineState).toBeVisible();
    await expect(offlineState).toHaveAttribute("data-v3-system-state", "offline");
    await expect(offlineState).toHaveAttribute("data-failure-aware-safety", "queued_for_sync");
    await expect(offlineState).toHaveAttribute("data-failure-aware-auto-sync", "queue-backed");
    await expect(offlineState).toContainText("전송 대기열에 저장되어 있습니다");
    await expect(offlineState).toContainText("자동 재시도가 대기열에 등록되어 있습니다");
    const initialProbe = await outboxProbe(page);
    expect(initialProbe).toEqual({
      queueCount: 1,
      entryKeySetExact: true,
      signalKeySetExact: true,
      conceptKeySetExact: true,
      queueIdIsUuid: true,
      queueIdentityPersisted: false,
      queuedAtCanonical: true,
      accountScopeIsSha256: true,
      autoSyncRegistered: true,
      metadataOnly: true,
      rawFieldAbsent: true,
      credentialShapeAbsent: true,
      learnerEntryValuesAbsent: true,
    });
    expect(interceptedCompletionRequestCount).toBe(0);

    let axeBlockingCount = 0;
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await expect(offlineState).toBeVisible();
      await expectNoHorizontalOverflow(page, `${viewport.label}px`);
      const accessibility = await new AxeBuilder({ page })
        .include("#learner-main")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blockingCount = accessibility.violations.filter(
        (violation) =>
          violation.impact === "serious" || violation.impact === "critical",
      ).length;
      axeBlockingCount += blockingCount;
      expect(
        blockingCount,
        `${viewport.label}px Axe serious/critical violation count`,
      ).toBe(0);
    }

    await page.setViewportSize({ width: 720, height: 1024 });
    await expectNoHorizontalOverflow(page, "1440px desktop at 200% width equivalent");
    const editButton = page.getByRole("button", { name: "입력 수정" });
    await expect(editButton).toBeVisible();
    expect(await reachByKeyboardTab(page, editButton)).toBe(true);
    expect(await editButton.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
    const ariaStatus = offlineState.locator('[role="status"]');
    await expect(ariaStatus).toContainText("오프라인");
    await expect(ariaStatus).toHaveAttribute("aria-live", "polite");
    await expect(ariaStatus).toHaveAttribute("aria-atomic", "true");

    await rememberQueueIdentity(page);
    sessionStage = "foreign";
    await context.setOffline(false);
    await expect(
      page.locator('[data-calculator-routine-sync-state="account_mismatch"]'),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator('[data-calculator-routine-account-scope="pending"]'),
    ).toBeVisible();
    expect(interceptedCompletionRequestCount).toBe(0);
    const liveForeignProbe = await outboxProbe(page);
    expect(liveForeignProbe.queueCount).toBe(1);
    expect(liveForeignProbe.queueIdentityPersisted).toBe(true);

    await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(
      page.locator('[data-calculator-routine-sync-state="account_mismatch"]'),
    ).toBeVisible({ timeout: 20_000 });
    expect(interceptedCompletionRequestCount).toBe(0);
    const reloadedForeignProbe = await outboxProbe(page);
    expect(reloadedForeignProbe.queueCount).toBe(1);
    expect(reloadedForeignProbe.queueIdentityPersisted).toBe(true);

    sessionStage = "actual";
    transportStage = "auth";
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect.poll(() => interceptedCompletionRequestCount, { timeout: 20_000 }).toBe(1);
    await expect(
      page.locator('[data-calculator-routine-sync-state="local_only"]'),
    ).toBeVisible();
    const afterAuthProbe = await outboxProbe(page);
    expect(afterAuthProbe.queueCount).toBe(1);
    expect(afterAuthProbe.queueIdentityPersisted).toBe(true);
    expect(afterAuthProbe.entryKeySetExact).toBe(true);
    expect(afterAuthProbe.signalKeySetExact).toBe(true);

    transportStage = "malformed";
    await signalOutboxStorage(page);
    await expect.poll(() => interceptedCompletionRequestCount, { timeout: 20_000 }).toBe(2);
    await expect(
      page.locator('[data-calculator-routine-sync-state="pending"]'),
    ).toBeVisible();
    const afterMalformedProbe = await outboxProbe(page);
    expect(afterMalformedProbe.queueCount).toBe(1);
    expect(afterMalformedProbe.queueIdentityPersisted).toBe(true);
    expect(afterMalformedProbe.entryKeySetExact).toBe(true);
    expect(afterMalformedProbe.signalKeySetExact).toBe(true);

    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    sessionStage = "unavailable";
    transportStage = "durable";
    const writerPage = await context.newPage();
    await writerPage.setViewportSize(viewports[0]);
    const writerErrors = monitorRuntimeErrors(writerPage);
    await writerPage.goto("/app/calculator?mode=second&context=practice&focus=casio", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await expect(
      writerPage.locator('[data-calculator-routine-sync-state="failed"]'),
    ).toBeVisible({ timeout: 20_000 });
    sessionStage = "actual";
    await writerPage.bringToFront();
    await writerPage.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect.poll(() => interceptedCompletionRequestCount, {
      timeout: 20_000,
      message: "The replacement page mount must acquire the persisted outbox once.",
    }).toBe(3);
    const persistedProbe = await outboxProbe(writerPage);
    expect(persistedProbe.queueCount).toBe(1);

    const contenderPage = await context.newPage();
    await contenderPage.setViewportSize(viewports[0]);
    const contenderErrors = monitorRuntimeErrors(contenderPage);
    await contenderPage.goto("/app/calculator?mode=second&context=practice&focus=casio", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await waitForHydratedButton(
      contenderPage
        .locator("[data-calculator-routine-trainer]")
        .getByRole("button", { name: /루틴 시작/ }),
    );
    const readLockState = () => contenderPage.evaluate(async (lockName) => {
      const manager = (navigator as Navigator & {
        locks: {
          query(): Promise<{
            held?: Array<{ name?: string }>;
            pending?: Array<{ name?: string }>;
          }>;
        };
      }).locks;
      const snapshot = await manager.query();
      return {
        held: (snapshot.held ?? []).filter((lock) => lock.name === lockName).length,
        pending: (snapshot.pending ?? []).filter((lock) => lock.name === lockName).length,
      };
    }, outboxLockName);
    await expect.poll(async () => {
      const state = await readLockState();
      return state.held === 1 && state.pending >= 1;
    }, {
      timeout: 20_000,
      message: "The contender tab must become pending behind the held outbox Web Lock.",
    }).toBe(true);
    const lockState = await readLockState();
    expect(lockState.held).toBe(1);
    expect(lockState.pending).toBeGreaterThanOrEqual(1);
    expect(
      interceptedCompletionRequestCount,
      "A second live tab must wait behind the held Web Lock receipt.",
    ).toBe(3);

    releaseDurableReceipt();
    await expect(
      writerPage.locator('[data-calculator-routine-sync-state="deduped"]'),
    ).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => (await outboxProbe(writerPage)).queueCount, {
      timeout: 20_000,
      message: "A valid synthetic durable receipt must remove the exact outbox entry.",
    }).toBe(0);
    await expect.poll(async () => (await outboxProbe(contenderPage)).queueCount, {
      timeout: 20_000,
      message: "Cross-tab storage must converge after the receipt-bound removal.",
    }).toBe(0);
    await expect(
      page.locator('[data-calculator-routine-sync-state="pending"]'),
      "The original pending tab must clear its stale queue claim after cross-tab removal.",
    ).toHaveCount(0);
    await contenderPage.waitForTimeout(500);
    expect(interceptedCompletionRequestCount).toBe(3);
    await expectNoHorizontalOverflow(writerPage, "post-receipt 390px");
    const observedAfter = await observedDeploymentSha(writerPage);
    expect(observedAfter.deploymentSha).toBe(runtimeRunnerSha);
    expect(serverMutationRequestCount).toBe(0);
    expectOnlyControlledInitialConsoleErrors(initialErrors.consoleErrors);
    expect(initialErrors.pageErrors).toEqual([]);
    expect(initialErrors.sameOriginRequestFailures).toHaveLength(1);
    expect(initialErrors.sameOriginRequestFailures[0]).toContain("HTTP 401");
    expect(writerErrors.consoleErrors).toEqual([]);
    expect(writerErrors.pageErrors).toEqual([]);
    expect(writerErrors.sameOriginRequestFailures).toEqual([]);
    expect(contenderErrors.consoleErrors).toEqual([]);
    expect(contenderErrors.pageErrors).toEqual([]);
    expect(contenderErrors.sameOriginRequestFailures).toEqual([]);

    const evidence = {
      schemaVersion: 1,
      result: "pass",
      runnerSha: runtimeRunnerSha,
      targetDeploymentSha: runtimeTargetSha,
      observedDeploymentSha: observedAfter.deploymentSha ?? "",
      signInAttempts,
      viewportCount: viewports.length,
      desktopZoomWidthEquivalentPercent: 200,
      offlineQueueCreated: true,
      queueReadBackVerified: true,
      exactQueueSchemaVerified: true,
      opaqueAccountScopeVerified: true,
      reloadPersistenceVerified: true,
      queueIdentityPersisted: true,
      accountScopeMismatchDenied: true,
      authResponsePreservedQueue: true,
      malformedReceiptPreservedQueue: true,
      crossTabSingleWriterVerified: true,
      mountAutoSyncVerified: true,
      syntheticDurableReceiptContractVerified: true,
      queueRemovedAfterReceipt: true,
      autoSyncRegistered: initialProbe.autoSyncRegistered,
      rawFieldAbsent: initialProbe.rawFieldAbsent,
      credentialShapeAbsent: initialProbe.credentialShapeAbsent,
      learnerEntryValuesAbsent: initialProbe.learnerEntryValuesAbsent,
      responsiveOverflowVerified: true,
      widthEquivalentReflowVerified: true,
      keyboardTabReachabilityVerified: true,
      ariaLiveStatusContractVerified: true,
      axeBlockingCount,
      interceptedCompletionRequestCount,
      serverMutationRequestCount,
      unexpectedConsoleErrorCount:
        unexpectedInitialConsoleErrors(initialErrors.consoleErrors).length +
        writerErrors.consoleErrors.length +
        contenderErrors.consoleErrors.length,
      pageErrorCount: 0,
      unexpectedSameOriginRequestFailureCount: 0,
      globalDatabaseImmutabilityClaimed: false,
      credentialsCaptured: false,
      rawLearnerContentCaptured: false,
      requestBodyCaptured: false,
      responseBodyCaptured: false,
      queueIdCaptured: false,
      recordIdCaptured: false,
      accountScopeCaptured: false,
      emailCaptured: false,
      urlCaptured: false,
      domCaptured: false,
      screenshotCaptured: false,
      traceCaptured: false,
      videoCaptured: false,
    };
    await writeFile(
      testInfo.outputPath("s232f5-runtime.json"),
      JSON.stringify(evidence, null, 2),
      "utf8",
    );
  } finally {
    releaseDurableReceipt();
    if (routeInstalled) {
      await context.unrouteAll({ behavior: "ignoreErrors" });
    }
  }
});
