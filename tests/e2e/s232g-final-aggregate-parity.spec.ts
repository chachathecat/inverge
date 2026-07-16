import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
  type Response,
  type Route,
  type TestInfo,
} from "@playwright/test";
import { writeFile } from "node:fs/promises";

import {
  S232G_ALIASES,
  S232G_EXCLUSIONS,
  S232G_ROUTES,
  S232G_VIEWPORTS,
  S232G_WIDTH_EQUIVALENT_VIEWPORT,
  buildS232GExpectedEvidenceDescriptors,
} from "../support/s232g-contract.mjs";
import {
  establishProtectedPreviewSession,
  loginWithDedicatedTestAccount,
  requireSafeAuthenticatedRuntime,
  runtimeBaseUrl,
  runtimeRunnerSha,
  runtimeTargetSha,
} from "./support/authenticated-runtime";

const runtimeEnabled = process.env.S232G_AUTH_RUNTIME === "1";
const accountAEmail = process.env.E2E_USER_A_EMAIL?.trim() ?? "";
const accountAPassword = process.env.E2E_USER_A_PASSWORD ?? "";
const accountBEmail = process.env.E2E_USER_B_EMAIL?.trim() ?? "";
const accountBPassword = process.env.E2E_USER_B_PASSWORD ?? "";
const runtimeRunNonce = process.env.S232G_RUN_NONCE?.trim() ?? "local";
const sourceTitle = `S232G aggregate synthetic Study Ledger source ${runtimeRunNonce}`;
const originalParagraph =
  "합성 원본 문단은 요건과 사실 대응을 확인하기 위한 비민감 테스트 기록입니다.";
const rewrittenParagraph =
  "합성 재작성 문단은 요건, 사실 적용, 소결론을 한 흐름으로 연결한 비민감 테스트 기록입니다.";
const syntheticCaptureText = `${sourceTitle}\n내 답안: ${originalParagraph}`;
const displayedCaptureText = syntheticCaptureText.replace(/\s+/g, " ").trim();

test.use({
  serviceWorkers: "block",
  screenshot: "off",
  trace: "off",
  video: "off",
});
test.skip(!runtimeEnabled, "Set S232G_AUTH_RUNTIME=1 for exact-head aggregate acceptance.");
test.describe.configure({ timeout: 720_000, retries: 0, mode: "serial" });

type RuntimePhase =
  | "normal"
  | "auth-navigation"
  | "cleanup"
  | "expected-cross-account-ui-denial";

type RuntimePhaseState = {
  current: RuntimePhase;
  observedAuthSignInRequestCount: number;
};

type RuntimeCounters = {
  consoleErrorCount: number;
  pageErrorCount: number;
  requestFailureCount: number;
  httpErrorCount: number;
  blockedPreviewToolbarMutationCount: number;
  excludedPreviewToolbarConsoleErrorCount: number;
  expectedCrossAccountHttpErrorCount: number;
  causallyBoundNavigationAbortCount: number;
  itemMutationRequestCount: number;
  calculatorRoutineCompletionRequestCount: number;
};

function createRuntimeCounters(): RuntimeCounters {
  return {
    consoleErrorCount: 0,
    pageErrorCount: 0,
    requestFailureCount: 0,
    httpErrorCount: 0,
    blockedPreviewToolbarMutationCount: 0,
    excludedPreviewToolbarConsoleErrorCount: 0,
    expectedCrossAccountHttpErrorCount: 0,
    causallyBoundNavigationAbortCount: 0,
    itemMutationRequestCount: 0,
    calculatorRoutineCompletionRequestCount: 0,
  };
}

function createRuntimePhaseState(): RuntimePhaseState {
  return {
    current: "normal",
    observedAuthSignInRequestCount: 0,
  };
}

function isPreviewToolbarUrl(raw: string) {
  try {
    const hostname = new URL(raw).hostname.toLowerCase();
    return hostname === "vercel.live" || hostname.endsWith(".vercel.live");
  } catch {
    return false;
  }
}

async function installPrivacySafeRuntimeGuard(
  context: BrowserContext,
  page: Page,
  counters: RuntimeCounters,
  phase: RuntimePhaseState,
) {
  const runtimeOrigin = new URL(runtimeBaseUrl).origin;
  await context.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && isPreviewToolbarUrl(request.url())) {
      counters.blockedPreviewToolbarMutationCount += 1;
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });

  page.on("request", (request) => {
    try {
      const location = new URL(request.url());
      if (
        phase.current === "auth-navigation" &&
        location.origin === runtimeOrigin &&
        location.pathname === "/api/auth/sign-in" &&
        request.method() === "POST"
      ) {
        phase.observedAuthSignInRequestCount += 1;
      }
      if (
        location.origin === runtimeOrigin &&
        location.pathname === "/api/os/items" &&
        request.method() === "POST"
      ) {
        counters.itemMutationRequestCount += 1;
      }
      if (
        location.origin === runtimeOrigin &&
        location.pathname === "/api/os/calculator-routine/complete" &&
        request.method() === "POST"
      ) {
        counters.calculatorRoutineCompletionRequestCount += 1;
      }
    } catch {
      // The response/request guards count malformed same-origin observations.
    }
  });

  page.on("console", (message) => {
    if (phase.current === "cleanup") return;
    if (message.type() !== "error") return;
    const exactToolbarBlock =
      message.text() === "Failed to load resource: net::ERR_BLOCKED_BY_CLIENT" &&
      isPreviewToolbarUrl(message.location().url) &&
      counters.excludedPreviewToolbarConsoleErrorCount <
        counters.blockedPreviewToolbarMutationCount;
    if (exactToolbarBlock) {
      counters.excludedPreviewToolbarConsoleErrorCount += 1;
      return;
    }
    counters.consoleErrorCount += 1;
  });
  page.on("pageerror", () => {
    if (phase.current === "cleanup") return;
    counters.pageErrorCount += 1;
  });
  page.on("requestfailed", (request) => {
    if (phase.current === "cleanup") return;
    const failure = request.failure()?.errorText ?? "";
    if (isPreviewToolbarUrl(request.url()) && failure.includes("ERR_BLOCKED_BY_CLIENT")) {
      return;
    }
    try {
      const location = new URL(request.url());
      if (location.origin !== runtimeOrigin) return;
      const boundedNavigationAbort =
        phase.current === "auth-navigation" &&
        failure.includes("ERR_ABORTED") &&
        request.isNavigationRequest() &&
        request.resourceType() === "document" &&
        (location.pathname === "/login" || location.pathname === "/app") &&
        phase.observedAuthSignInRequestCount > 0 &&
        counters.causallyBoundNavigationAbortCount < 1;
      if (boundedNavigationAbort) {
        counters.causallyBoundNavigationAbortCount += 1;
        return;
      }
    } catch {
      counters.requestFailureCount += 1;
      return;
    }
    counters.requestFailureCount += 1;
  });
  page.on("response", (response) => {
    if (phase.current === "cleanup") return;
    if (response.status() < 400) return;
    let sameOrigin = false;
    let expectedDenialDocument = false;
    try {
      const location = new URL(response.url());
      sameOrigin = location.origin === runtimeOrigin;
      expectedDenialDocument =
        phase.current === "expected-cross-account-ui-denial" &&
        response.status() === 404 &&
        response.request().isNavigationRequest() &&
        /^\/app\/items\/[^/]+$/.test(location.pathname);
    } catch {
      counters.httpErrorCount += 1;
      return;
    }
    if (!sameOrigin) return;
    if (expectedDenialDocument) {
      counters.expectedCrossAccountHttpErrorCount += 1;
      return;
    }
    counters.httpErrorCount += 1;
  });
}

async function staticStage<T>(code: string, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch {
    emitSafeFailureDiagnostic("stage", code);
    throw new Error(`S232G static stage failed: ${code}`);
  }
}

function requireTruth(value: unknown, code: string): asserts value {
  if (!value) {
    emitSafeFailureDiagnostic("assertion", code);
    throw new Error(`S232G acceptance failed: ${code}`);
  }
}

function emitSafeFailureDiagnostic(kind: "stage" | "assertion", code: string) {
  const safeCode = /^[a-z0-9-]{1,64}$/.test(code) ? code : "unknown";
  process.stdout.write(`[S232G] failure; kind=${kind}; code=${safeCode}\n`);
}

type SyntheticTextareaValueState =
  | "exact-after-timeout"
  | "empty"
  | "whitespace-equivalent"
  | "different"
  | "wrong-control"
  | "unavailable";

const syntheticTextareaFailureCodes = {
  "exact-after-timeout": "capture-text-entry-value-exact-after-timeout",
  empty: "capture-text-entry-value-empty",
  "whitespace-equivalent": "capture-text-entry-value-whitespace-equivalent",
  different: "capture-text-entry-value-different",
  "wrong-control": "capture-text-entry-value-wrong-control",
  unavailable: "capture-text-entry-value-unavailable",
} as const satisfies Record<SyntheticTextareaValueState, string>;

async function classifySyntheticTextareaValue(
  input: Locator,
  expectedValue: string,
): Promise<SyntheticTextareaValueState> {
  try {
    const state = await input.evaluate(
      (element, expected) => {
        if (!(element instanceof HTMLTextAreaElement)) return "wrong-control" as const;
        if (element.value === expected) return "exact-after-timeout" as const;
        if (element.value === "") return "empty" as const;
        const normalizeWhitespace = (value: string) => value.replace(/\s+/gu, " ").trim();
        return normalizeWhitespace(element.value) === normalizeWhitespace(expected)
          ? ("whitespace-equivalent" as const)
          : ("different" as const);
      },
      expectedValue,
      { timeout: 5_000 },
    );
    switch (state) {
      case "exact-after-timeout":
      case "empty":
      case "whitespace-equivalent":
      case "different":
      case "wrong-control":
        return state;
      default:
        return "unavailable";
    }
  } catch {
    return "unavailable";
  }
}

async function requireExactSyntheticTextareaValue(input: Locator, expectedValue: string) {
  try {
    await expect(input).toHaveValue(expectedValue, { timeout: 20_000 });
    return;
  } catch {
    const state = await classifySyntheticTextareaValue(input, expectedValue);
    const code = syntheticTextareaFailureCodes[state];
    emitSafeFailureDiagnostic("assertion", code);
    throw new Error(`S232G acceptance failed: ${code}`);
  }
}

function requireTwoAccounts() {
  requireTruth(accountAEmail && accountAPassword && accountBEmail && accountBPassword, "two-account-env");
  requireTruth(
    accountAEmail !== accountBEmail || accountAPassword !== accountBPassword,
    "two-account-credential-distinction",
  );
}

function requireRunNonce() {
  requireTruth(/^\d+-\d+$/.test(runtimeRunNonce), "run-nonce-format");
}

async function observedDeploymentSha(page: Page) {
  return staticStage("observed-deployment", () =>
    page.evaluate(async () => {
      const response = await fetch("/api/runtime/version", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const body = (await response.json()) as {
        ready?: unknown;
        deploymentSha?: unknown;
      };
      return {
        status: response.status,
        ready: body.ready === true,
        deploymentSha:
          typeof body.deploymentSha === "string" ? body.deploymentSha : "",
      };
    }),
  );
}

async function authenticatedIdentity(page: Page) {
  return staticStage("authenticated-identity", () =>
    page.evaluate(async () => {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const body = (await response.json()) as {
        ok?: unknown;
        session?: { isAuthenticated?: unknown; userId?: unknown };
      };
      if (
        response.status !== 200 ||
        body.ok !== true ||
        body.session?.isAuthenticated !== true ||
        typeof body.session.userId !== "string"
      ) {
        throw new Error("identity-unavailable");
      }
      return body.session.userId;
    }),
  );
}

async function loginWithCredentials(page: Page, email: string, password: string) {
  await staticStage("secondary-login", async () => {
    await page.goto("/login?mode=second", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    const emailInput = page.getByLabel("이메일");
    const passwordInput = page.getByLabel("비밀번호");
    const submit = page.getByTestId("login-submit");
    await emailInput.waitFor({ state: "visible", timeout: 20_000 });
    await passwordInput.waitFor({ state: "visible", timeout: 20_000 });
    await submit.waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForFunction(
      () => {
        const button = document.querySelector('[data-testid="login-submit"]');
        return Boolean(
          button &&
            Object.keys(button).some(
              (key) => key.startsWith("__reactProps$") || key.startsWith("__reactFiber$"),
            ),
        );
      },
      null,
      { timeout: 20_000 },
    );
    await emailInput.fill("hydration-check@inverge.invalid");
    if ((await emailInput.inputValue()) !== "hydration-check@inverge.invalid") {
      throw new Error("hydration-sentinel-rejected");
    }
    await emailInput.fill(email);
    await passwordInput.fill(password);
    await page.waitForFunction(
      ({ expectedEmail, expectedPassword }) => {
        const emailControl = document.querySelector<HTMLInputElement>('input[type="email"]');
        const passwordControl = document.querySelector<HTMLInputElement>('input[type="password"]');
        const button = document.querySelector<HTMLButtonElement>('[data-testid="login-submit"]');
        return (
          emailControl?.value === expectedEmail &&
          passwordControl?.value === expectedPassword &&
          button?.disabled === false
        );
      },
      { expectedEmail: email, expectedPassword: password },
      { timeout: 20_000 },
    );

    let requestEmitted = false;
    const observeRequest = (request: { method(): string; url(): string }) => {
      try {
        if (
          request.method() === "POST" &&
          new URL(request.url()).pathname === "/api/auth/sign-in"
        ) {
          requestEmitted = true;
        }
      } catch {
        // A malformed unrelated URL is not a sign-in request.
      }
    };
    page.on("request", observeRequest);
    const waitForSignIn = () =>
      page
        .waitForResponse((response) => {
          try {
            return (
              response.request().method() === "POST" &&
              new URL(response.url()).pathname === "/api/auth/sign-in"
            );
          } catch {
            return false;
          }
        }, { timeout: 20_000 })
        .catch(() => null);
    let response: Response | null = null;
    try {
      let responsePromise = waitForSignIn();
      await submit.click({ timeout: 20_000 });
      response = await responsePromise;
      if (!response && !requestEmitted) {
        await emailInput.fill(email);
        await passwordInput.fill(password);
        responsePromise = waitForSignIn();
        await submit.click({ timeout: 20_000 });
        response = await responsePromise;
      }
    } finally {
      page.off("request", observeRequest);
    }
    if (!response) throw new Error("sign-in-response-missing");
    if (response.status() !== 200) throw new Error("sign-in-rejected");
    await page.waitForFunction(() => window.location.pathname === "/app", null, {
      timeout: 20_000,
    });
    await page.locator('[data-s224v-surface="/app"]').waitFor({
      state: "visible",
      timeout: 20_000,
    });
  });
}

async function requireSyntheticMutationCapacity(page: Page) {
  const capacity = await staticStage("synthetic-capacity", () =>
    page.evaluate(async () => {
      const response = await fetch("/api/os/usage", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const body = (await response.json().catch(() => null)) as
        | {
            ok?: unknown;
            usage?: {
              tier?: unknown;
              monthlyLimit?: unknown;
              monthlyUsed?: unknown;
              remaining?: unknown;
              burstBlocked?: unknown;
            };
          }
        | null;
      const usage = body?.usage;
      return {
        exact:
          response.status === 200 &&
          body?.ok === true &&
          Object.keys(body).sort().join(",") === "ok,usage" &&
          usage !== null &&
          typeof usage === "object" &&
          Object.keys(usage).sort().join(",") ===
            "burstBlocked,monthlyLimit,monthlyUsed,remaining,tier",
        sufficient:
          usage?.burstBlocked === false &&
          typeof usage.remaining === "number" &&
          Number.isInteger(usage.remaining) &&
          usage.remaining >= 2,
        monthlyUsed:
          typeof usage?.monthlyUsed === "number" && Number.isInteger(usage.monthlyUsed)
            ? usage.monthlyUsed
            : -1,
      };
    }),
  );
  requireTruth(capacity.exact, "synthetic-capacity-exact");
  requireTruth(capacity.sufficient, "synthetic-capacity-sufficient");
  requireTruth(capacity.monthlyUsed >= 0, "synthetic-capacity-monthly-used");
  return capacity;
}

async function requireSyntheticUsageDelta(page: Page, monthlyUsedBefore: number) {
  const after = await staticStage("synthetic-usage-delta", () =>
    page.evaluate(async () => {
      const response = await fetch("/api/os/usage", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const body = (await response.json().catch(() => null)) as
        | {
            ok?: unknown;
            usage?: {
              tier?: unknown;
              monthlyLimit?: unknown;
              monthlyUsed?: unknown;
              remaining?: unknown;
              burstBlocked?: unknown;
            };
          }
        | null;
      return {
        exact:
          response.status === 200 &&
          body?.ok === true &&
          Object.keys(body).sort().join(",") === "ok,usage" &&
          body.usage !== null &&
          typeof body.usage === "object" &&
          Object.keys(body.usage).sort().join(",") ===
            "burstBlocked,monthlyLimit,monthlyUsed,remaining,tier",
        monthlyUsed:
          typeof body?.usage?.monthlyUsed === "number" &&
          Number.isInteger(body.usage.monthlyUsed)
            ? body.usage.monthlyUsed
            : -1,
      };
    }),
  );
  requireTruth(after.exact, "synthetic-usage-postflight-exact");
  requireTruth(after.monthlyUsed === monthlyUsedBefore + 2, "synthetic-usage-exact-delta");
}

async function createSyntheticSourceThroughCapture(
  page: Page,
  accountUserId: string,
) {
  const capacityBefore = await requireSyntheticMutationCapacity(page);
  const collisionFree = await staticStage("synthetic-source-collision", () =>
    page.evaluate(async (expectedTitle) => {
      const response = await fetch("/api/os/items?limit=100", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const body = (await response.json().catch(() => null)) as
        | { ok?: unknown; items?: Array<{ problemTitle?: unknown }> }
        | null;
      return (
        response.status === 200 &&
        body?.ok === true &&
        Object.keys(body).sort().join(",") === "items,ok" &&
        Array.isArray(body.items) &&
        body.items.every((item) => item.problemTitle !== expectedTitle)
      );
    }, sourceTitle),
  );
  requireTruth(collisionFree, "synthetic-source-title-unique");

  await staticStage("capture-draft-reset", () =>
    page.evaluate((userId) => {
      window.localStorage.removeItem(`inverge:review-os:${userId}:capture-draft:second`);
    }, accountUserId),
  );
  await navigateFixed(
    page,
    "/app/capture?mode=second",
    '[data-s224v-surface="/app/capture"] form[data-s232e-capture-flow="four-stage"]',
  );
  const captureForm = page.locator(
    '[data-s224v-surface="/app/capture"] form[data-s232e-capture-flow="four-stage"]',
  );
  const textInputMethod = captureForm.getByRole("button", {
    name: "텍스트 붙여넣기",
    exact: true,
  });
  await staticStage("capture-input-method-ready", async () => {
    await textInputMethod.waitFor({ state: "visible", timeout: 20_000 });
    await expect(textInputMethod).toBeEnabled({ timeout: 20_000 });
    await expect
      .poll(
        () =>
          textInputMethod.evaluate(
            (element) => {
              const reactPropsKey = Object.keys(element).find((key) =>
                key.startsWith("__reactProps$"),
              );
              if (!reactPropsKey) return false;
              const reactProps = (
                element as unknown as Record<string, { onClick?: unknown } | undefined>
              )[reactPropsKey];
              return typeof reactProps?.onClick === "function";
            },
            { timeout: 20_000 },
          ),
        {
          timeout: 20_000,
          message: "Capture input method must be hydrated before keyboard activation.",
        },
      )
      .toBe(true);
  });
  await staticStage("capture-input-method-activate", async () => {
    await textInputMethod.focus({ timeout: 20_000 });
    await expect(textInputMethod).toBeFocused({ timeout: 20_000 });
    await textInputMethod.press("Enter", { timeout: 20_000 });
  });
  const input = captureForm.getByLabel("오늘 공부한 내용 또는 내 답안", { exact: true });
  await staticStage("capture-text-entry-visible", () =>
    expect(input).toBeVisible({ timeout: 20_000 }),
  );
  await staticStage("capture-text-entry-focused", () =>
    expect(input).toBeFocused({ timeout: 20_000 }),
  );
  await staticStage("capture-text-entry-editable", () =>
    expect(input).toBeEditable({ timeout: 20_000 }),
  );
  await staticStage("capture-text-entry-fill", () =>
    input.fill(syntheticCaptureText, { timeout: 20_000 }),
  );
  await requireExactSyntheticTextareaValue(input, syntheticCaptureText);

  let releaseRequest = () => {};
  const heldRequest = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  const holdItemMutation = async (route: Route) => {
    await heldRequest;
    await route.fallback();
  };
  await page.route("**/api/os/items", holdItemMutation, { times: 1 });
  let response: Response | null = null;
  try {
    const responsePromise = page.waitForResponse((candidate) => {
      try {
        return (
          candidate.request().method() === "POST" &&
          new URL(candidate.url()).pathname === "/api/os/items"
        );
      } catch {
        return false;
      }
    }, { timeout: 60_000 });
    await page
      .getByTestId("capture-save-action-bar")
      .getByRole("button", { name: "빠르게 저장", exact: true })
      .click();
    const saving = page.locator('[data-capture-persistence-state="saving"]');
    await saving.waitFor({ state: "visible", timeout: 20_000 });
    const savingAnnouncement = await saving.evaluate((element) => ({
      role: element.getAttribute("role"),
      live: element.getAttribute("aria-live"),
      busy: element.getAttribute("aria-busy"),
      visible:
        element.getBoundingClientRect().width > 0 &&
        element.getBoundingClientRect().height > 0,
    }));
    requireTruth(
      savingAnnouncement.role === "status" &&
        savingAnnouncement.live === "polite" &&
        savingAnnouncement.busy === "true" &&
        savingAnnouncement.visible,
      "capture-saving-announcement",
    );
    requireTruth(
      (await page.locator('fieldset[data-capture-work-lock="locked"]:disabled').count()) === 1,
      "capture-saving-work-lock",
    );
    releaseRequest();
    response = await responsePromise;
  } finally {
    releaseRequest();
    await page.unroute("**/api/os/items", holdItemMutation);
  }

  requireTruth(response, "capture-source-response");
  const receipt = await staticStage("capture-source-receipt", () =>
    response.json() as Promise<{ ok?: unknown; deduped?: unknown; item?: { id?: unknown } }>,
  );
  requireTruth(response.status() === 200, "capture-source-http-receipt");
  requireTruth(receipt.ok === true, "capture-source-ok-receipt");
  requireTruth(receipt.deduped === false, "capture-source-new-receipt");
  requireTruth(typeof receipt.item?.id === "string", "capture-source-item-receipt");
  requireTruth(
    Object.keys(receipt).sort().join(",") === "deduped,item,ok",
    "capture-source-exact-receipt",
  );

  const completed = page.locator(
    '[data-testid="capture-persistence-completed-state"]' +
      '[data-v3-system-state="completed"]' +
      '[data-failure-aware-safety="persisted"]',
  );
  await completed.waitFor({ state: "visible", timeout: 30_000 });
  const completedAnnouncement = await staticStage("capture-completed-announcement", () =>
    page.getByTestId("capture-save-confirmation").evaluate((element) => ({
      receiptBound: element.getAttribute("data-capture-receipt-bound") === "true",
      completedStateCount: element.querySelectorAll(
        '[data-v3-system-state="completed"]',
      ).length,
      politeAtomicStatusCount: element.querySelectorAll(
        '[role="status"][aria-live="polite"][aria-atomic="true"]',
      ).length,
    })),
  );
  requireTruth(
    completedAnnouncement.receiptBound &&
      completedAnnouncement.completedStateCount === 1 &&
      completedAnnouncement.politeAtomicStatusCount >= 1,
    "capture-completed-announcement",
  );

  await continueSavedCaptureToReview(page);

  return {
    id: receipt.item.id,
    created: true,
    mutationAttempted: true,
    savingTransitionObserved: true,
    completedTransitionObserved: true,
    monthlyUsedBefore: capacityBefore.monthlyUsed,
  };
}

async function ownerDetailProbe(page: Page, itemId: string, expectedUserId: string) {
  return staticStage("owner-detail-probe", () =>
    page.evaluate(
      async ({ requestedItemId, ownerUserId }) => {
        const response = await fetch(
          `/api/os/items/${encodeURIComponent(requestedItemId)}`,
          { cache: "no-store", credentials: "same-origin" },
        );
        const body = (await response.json().catch(() => null)) as
          | { ok?: unknown; detail?: { item?: { id?: unknown; userId?: unknown } } | null }
          | null;
        return (
          response.status === 200 &&
          body?.ok === true &&
          Object.keys(body).sort().join(",") === "detail,ok" &&
          body.detail?.item?.id === requestedItemId &&
          body.detail.item.userId === ownerUserId
        );
      },
      { requestedItemId: itemId, ownerUserId: expectedUserId },
    ),
  );
}

async function sourceDetailProbe(
  page: Page,
  itemId: string,
  expectedUserId: string,
) {
  return staticStage("source-detail-probe", () =>
    page.evaluate(
      async ({ requestedItemId, ownerUserId, expectedTitle, expectedParagraph }) => {
        const response = await fetch(
          `/api/os/items/${encodeURIComponent(requestedItemId)}`,
          { cache: "no-store", credentials: "same-origin" },
        );
        const body = (await response.json().catch(() => null)) as
          | {
              ok?: unknown;
              detail?: {
                item?: {
                  id?: unknown;
                  userId?: unknown;
                  examName?: unknown;
                  problemTitle?: unknown;
                  userAnswer?: unknown;
                  rawPayload?: Record<string, unknown>;
                };
              } | null;
            }
          | null;
        const item = body?.detail?.item;
        return (
          response.status === 200 &&
          body?.ok === true &&
          Object.keys(body).sort().join(",") === "detail,ok" &&
          item?.id === requestedItemId &&
          item.userId === ownerUserId &&
          item.examName === "감정평가사 2차" &&
          item.problemTitle === expectedTitle &&
          item.userAnswer === expectedParagraph &&
          item.rawPayload?.created_from_capture === true
        );
      },
      {
        requestedItemId: itemId,
        ownerUserId: expectedUserId,
        expectedTitle: sourceTitle,
        expectedParagraph: syntheticCaptureText,
      },
    ),
  );
}

async function crossAccountApiDenialProbe(page: Page, itemId: string) {
  return staticStage("cross-account-api-denial", () =>
    page.evaluate(async (requestedItemId) => {
      const response = await fetch(
        `/api/os/items/${encodeURIComponent(requestedItemId)}`,
        { cache: "no-store", credentials: "same-origin" },
      );
      const body = (await response.json().catch(() => null)) as
        | { ok?: unknown; detail?: unknown }
        | null;
      return (
        response.status === 200 &&
        body?.ok === true &&
        body.detail === null &&
        Object.keys(body).sort().join(",") === "detail,ok"
      );
    }, itemId),
  );
}

async function reviewQueueMembershipProbe(page: Page, itemId: string) {
  return staticStage("review-queue-membership", () =>
    page.evaluate(async (expectedItemId) => {
      const response = await fetch("/api/os/review-queue", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const body = (await response.json().catch(() => null)) as
        | {
            ok?: unknown;
            items?: Array<{
              itemId?: unknown;
              examName?: unknown;
              createdFromCapture?: unknown;
            }>;
          }
        | null;
      const matches = Array.isArray(body?.items)
        ? body.items.filter((item) => item.itemId === expectedItemId)
        : [];
      return (
        response.status === 200 &&
        body?.ok === true &&
        Object.keys(body).sort().join(",") === "items,ok" &&
        matches.length === 1 &&
        matches[0]?.examName === "감정평가사 2차" &&
        matches[0]?.createdFromCapture === true
      );
    }, itemId),
  );
}

async function todayFocusMembershipProbe(page: Page, itemId: string) {
  return staticStage("today-focus-membership", () =>
    page.evaluate(async (expectedItemId) => {
      const response = await fetch("/api/os/today-focus?mode=second", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const body = (await response.json().catch(() => null)) as
        | {
            ok?: unknown;
            focus?: {
              queue?: Array<{ itemId?: unknown }>;
              lines?: unknown;
              nextAction?: unknown;
              nextActionType?: unknown;
              primaryTaskLabel?: unknown;
              reason?: unknown;
              estimatedDurationMinutes?: unknown;
              priorityScore?: unknown;
              sourceQueueId?: unknown;
              sourceItemId?: unknown;
            };
          }
        | null;
      const focus = body?.focus;
      return (
        response.status === 200 &&
        body?.ok === true &&
        Object.keys(body).sort().join(",") === "focus,ok" &&
        focus !== null &&
        typeof focus === "object" &&
        Object.keys(focus).sort().join(",") ===
          "estimatedDurationMinutes,lines,nextAction,nextActionType,primaryTaskLabel,priorityScore,queue,reason,sourceItemId,sourceQueueId" &&
        Array.isArray(focus.queue) &&
        focus.queue.filter((item) => item.itemId === expectedItemId).length === 1
      );
    }, itemId),
  );
}

async function boundedCollectionAbsenceProbe(
  page: Page,
  forbiddenItemIds: readonly string[],
) {
  return staticStage("bounded-collection-absence", () =>
    page.evaluate(async (itemIds) => {
      const [itemsResponse, queueResponse, todayResponse] = await Promise.all([
        fetch("/api/os/items?limit=100", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/os/review-queue", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/os/today-focus?mode=second", {
          cache: "no-store",
          credentials: "same-origin",
        }),
      ]);
      const [itemsBody, queueBody, todayBody] = (await Promise.all([
        itemsResponse.json().catch(() => null),
        queueResponse.json().catch(() => null),
        todayResponse.json().catch(() => null),
      ])) as [
        { ok?: unknown; items?: Array<{ id?: unknown }> } | null,
        { ok?: unknown; items?: Array<{ itemId?: unknown }> } | null,
        { ok?: unknown; focus?: { queue?: Array<{ itemId?: unknown }>; sourceItemId?: unknown } } | null,
      ];
      const forbidden = new Set(itemIds);
      const itemIdsAbsent =
        Array.isArray(itemsBody?.items) &&
        itemsBody.items.every((item) => typeof item.id !== "string" || !forbidden.has(item.id));
      const queueIdsAbsent =
        Array.isArray(queueBody?.items) &&
        queueBody.items.every(
          (item) => typeof item.itemId !== "string" || !forbidden.has(item.itemId),
        );
      const todayIdsAbsent =
        Array.isArray(todayBody?.focus?.queue) &&
        todayBody.focus.queue.every(
          (item) => typeof item.itemId !== "string" || !forbidden.has(item.itemId),
        ) &&
        (typeof todayBody.focus.sourceItemId !== "string" ||
          !forbidden.has(todayBody.focus.sourceItemId));
      return (
        itemsResponse.status === 200 &&
        queueResponse.status === 200 &&
        todayResponse.status === 200 &&
        itemsBody?.ok === true &&
        queueBody?.ok === true &&
        todayBody?.ok === true &&
        Object.keys(itemsBody).sort().join(",") === "items,ok" &&
        Object.keys(queueBody).sort().join(",") === "items,ok" &&
        Object.keys(todayBody).sort().join(",") === "focus,ok" &&
        itemIdsAbsent &&
        queueIdsAbsent &&
        todayIdsAbsent
      );
    }, [...forbiddenItemIds]),
  );
}

async function navigateFixed(page: Page, href: string, readySelector: string) {
  await staticStage("fixed-route-navigation", async () => {
    await page.goto(href, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.locator(readySelector).first().waitFor({ state: "visible", timeout: 25_000 });
  });
}

async function navigateDynamicDetail(page: Page, itemId: string) {
  await staticStage("dynamic-route-navigation", async () => {
    await page.goto(`/app/items/${encodeURIComponent(itemId)}?mode=second`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.locator("[data-s228-study-ledger-detail]").waitFor({
      state: "visible",
      timeout: 25_000,
    });
  });
}

async function performDurableRewrite(page: Page, sourceItemId: string) {
  await navigateDynamicDetail(page, sourceItemId);
  await staticStage("rewrite-entry", async () => {
    const action = page.locator("[data-s228-primary-action]");
    const href = await action.getAttribute("href");
    requireTruth(
      href === `/app/capture?mode=second&rewriteFrom=${encodeURIComponent(sourceItemId)}`,
      "rewrite-source-action-binding",
    );
    await action.click({ timeout: 20_000 });
    await page.waitForFunction(
      () =>
        window.location.pathname === "/app/capture" &&
        new URLSearchParams(window.location.search).has("rewriteFrom"),
      null,
      { timeout: 20_000 },
    );
  });

  const editor = page.getByLabel("다시 쓴 문단", { exact: true });
  await staticStage("rewrite-editor", async () => {
    await editor.waitFor({ state: "visible", timeout: 20_000 });
    await editor.fill(rewrittenParagraph);
  });
  const response = await staticStage("rewrite-save", async () => {
    const responsePromise = page.waitForResponse((candidate) => {
      try {
        return (
          candidate.request().method() === "POST" &&
          new URL(candidate.url()).pathname === "/api/os/items"
        );
      } catch {
        return false;
      }
    }, { timeout: 30_000 });
    await page.getByRole("button", { name: "문단 다시쓰기 저장", exact: true }).click({
      timeout: 20_000,
    });
    return responsePromise;
  });
  const receipt = await staticStage("rewrite-receipt", () =>
    response.json() as Promise<{ ok?: unknown; deduped?: unknown; item?: { id?: unknown } }>,
  );
  requireTruth(response.status() === 200, "rewrite-http-receipt");
  requireTruth(receipt.ok === true, "rewrite-ok-receipt");
  requireTruth(receipt.deduped === false, "rewrite-new-durable-receipt");
  requireTruth(typeof receipt.item?.id === "string", "rewrite-item-receipt");
  requireTruth(
    Object.keys(receipt).sort().join(",") === "deduped,item,ok",
    "rewrite-exact-receipt",
  );

  const confirmationProbe = await staticStage("rewrite-state-announcement", () =>
    page.getByTestId("capture-save-confirmation").evaluate((element) => ({
      visible: element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0,
      receiptBound: element.getAttribute("data-capture-receipt-bound") === "true",
      politeAtomicStatusCount: element.querySelectorAll(
        '[role="status"][aria-live="polite"][aria-atomic="true"]',
      ).length,
    })),
  );
  requireTruth(confirmationProbe.visible, "rewrite-confirmation-visible");
  requireTruth(confirmationProbe.receiptBound, "rewrite-confirmation-bound");
  requireTruth(confirmationProbe.politeAtomicStatusCount >= 1, "rewrite-live-region");
  return receipt.item.id;
}

async function rewriteBindingProbe(
  page: Page,
  rewrittenItemId: string,
  sourceItemId: string,
  expectedUserId: string,
) {
  return staticStage("rewrite-binding-probe", () =>
    page.evaluate(
      async ({ requestedItemId, expectedSourceId, ownerUserId, expectedParagraph }) => {
        const response = await fetch(
          `/api/os/items/${encodeURIComponent(requestedItemId)}`,
          { cache: "no-store", credentials: "same-origin" },
        );
        const body = (await response.json().catch(() => null)) as
          | {
              ok?: unknown;
              detail?: {
                item?: {
                  id?: unknown;
                  userId?: unknown;
                  rawPayload?: Record<string, unknown>;
                };
              } | null;
            }
          | null;
        const item = body?.detail?.item;
        const confirmed =
          item?.rawPayload?.user_confirmed_fields &&
          typeof item.rawPayload.user_confirmed_fields === "object" &&
          !Array.isArray(item.rawPayload.user_confirmed_fields)
            ? (item.rawPayload.user_confirmed_fields as Record<string, unknown>)
            : null;
        return (
          response.status === 200 &&
          body?.ok === true &&
          Object.keys(body).sort().join(",") === "detail,ok" &&
          item?.id === requestedItemId &&
          item.userId === ownerUserId &&
          item.rawPayload?.rewrite_source_item_id === expectedSourceId &&
          item.rawPayload?.rewrite_paragraph === expectedParagraph &&
          confirmed?.rewrite_source_item_id === expectedSourceId &&
          confirmed?.rewrite_paragraph === expectedParagraph &&
          confirmed?.rewrite_completed === true
        );
      },
      {
        requestedItemId: rewrittenItemId,
        expectedSourceId: sourceItemId,
        ownerUserId: expectedUserId,
        expectedParagraph: rewrittenParagraph,
      },
    ),
  );
}

async function durableComparisonProbe(page: Page, itemId: string) {
  await navigateDynamicDetail(page, itemId);
  const comparison = page.locator("details").filter({
    has: page.getByText("이전 문단과 다시 쓴 문단 비교", { exact: true }),
  });
  await comparison.locator("summary").click();
  return staticStage("durable-comparison", () =>
    comparison.evaluate((details, expected) => {
      const root = document.querySelector("[data-s228-study-ledger-detail]");
      const completed = root?.querySelector('[data-s228-state="completed"]');
      const cells = Array.from(details.querySelectorAll<HTMLElement>(":scope > div > div"));
      const previousCell = cells.find(
        (cell) => cell.querySelector("p")?.textContent?.trim() === "이전 문단",
      );
      const rewrittenCell = cells.find(
        (cell) => cell.querySelector("p")?.textContent?.trim() === "다시 쓴 문단",
      );
      const previousValue = previousCell?.querySelectorAll("p").item(1).textContent?.trim();
      const rewrittenValue = rewrittenCell?.querySelectorAll("p").item(1).textContent?.trim();
      return (
        details.open &&
        Boolean(root && completed) &&
        previousValue === expected.previous &&
        rewrittenValue === expected.rewritten &&
        completed?.textContent?.includes(expected.rewritten) === true
      );
    }, { previous: displayedCaptureText, rewritten: rewrittenParagraph }),
  );
}

async function continueSavedCaptureToReview(page: Page) {
  await staticStage("saved-capture-to-review", async () => {
    const confirmation = page.locator(
      '[data-testid="capture-save-confirmation"]' +
        '[data-capture-plan-reflection-stage]' +
        '[data-capture-persistence-status="durable_saved"]' +
        '[data-capture-receipt-bound="true"]',
    );
    await confirmation.waitFor({ state: "visible", timeout: 30_000 });
    requireTruth(
      (await page.locator(
        '[data-capture-local-summary], [data-capture-persistence-failure], ' +
          '[data-capture-dedupe-conflict], [data-capture-receipt-bound="false"]',
      ).count()) === 0,
      "saved-capture-no-fallback-conflict",
    );
    await confirmation.getByText("다른 저장 위치 또는 새 기록", { exact: true }).click();
    await confirmation.getByRole("link", { name: "복습으로 이어가기", exact: true }).click();
    await page.waitForFunction(() => window.location.pathname === "/app/review", null, {
      timeout: 20_000,
    });
    await page.locator('[data-s232d4-review-page="priority-first"]').waitFor({
      state: "visible",
      timeout: 25_000,
    });
  });
}

async function notesRoundTripProbe(page: Page, itemId: string) {
  await navigateFixed(page, "/app/notes?mode=second", '[data-s232d3-notes-list="recent-first"]');
  const clicked = await staticStage("notes-round-trip-entry", () =>
    page.evaluate((expectedItemId) => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"));
      const target = links.find((link) => {
        try {
          const location = new URL(link.href);
          return location.pathname === `/app/items/${encodeURIComponent(expectedItemId)}`;
        } catch {
          return false;
        }
      });
      if (!target) return false;
      target.click();
      return true;
    }, itemId),
  );
  requireTruth(clicked, "notes-exact-item-entry");
  await staticStage("notes-round-trip-detail", () =>
    page.locator("[data-s228-study-ledger-detail]").waitFor({ state: "visible", timeout: 25_000 }),
  );
  return staticStage("notes-round-trip-content", () =>
    page.evaluate((expectedParagraph) =>
      Boolean(document.querySelector("[data-s228-study-ledger-detail]")?.textContent?.includes(expectedParagraph)),
    rewrittenParagraph),
  );
}

async function expectNoSyntheticExposure(
  page: Page,
  itemIds: readonly string[],
  values: readonly string[],
) {
  return staticStage("cross-account-collection-absence", () =>
    page.evaluate(
      ({ forbiddenItemIds, forbiddenValues }) => {
        const bodyText = document.body.innerText;
        const valueAbsent = forbiddenValues.every((value) => !bodyText.includes(value));
        const forbidden = new Set(forbiddenItemIds);
        const itemLinkAbsent = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]")).every(
          (link) => {
            try {
              const pathname = new URL(link.href).pathname;
              return forbiddenItemIds.every(
                (itemId) => pathname !== `/app/items/${encodeURIComponent(itemId)}`,
              );
            } catch {
              return false;
            }
          },
        );
        const serializedBody = document.body.innerHTML;
        const itemIdAbsent = [...forbidden].every(
          (itemId) => !serializedBody.includes(itemId),
        );
        return valueAbsent && itemLinkAbsent && itemIdAbsent;
      },
      { forbiddenItemIds: [...itemIds], forbiddenValues: values },
    ),
  );
}

async function navigateSettledCollection(
  page: Page,
  surface: "notes" | "review" | "today",
) {
  const contract = {
    notes: {
      href: "/app/notes?mode=second",
      ready:
        '[data-s232d3-notes-list="recent-first"], ' +
        '[data-testid="s232f4a-notes-empty-state"]',
    },
    review: {
      href: "/app/review?mode=second",
      ready:
        '[data-s232d4-review-page="priority-first"], ' +
        '[data-testid="s232f4a-review-empty-state"]',
    },
    today: {
      href: "/app?mode=second",
      ready:
        '[data-s232d5-today-page="single-priority"], ' +
        '[data-testid="s232f4a-today-empty-state"]',
    },
  } as const;
  const selected = contract[surface];
  await page.goto(selected.href, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator(selected.ready).first().waitFor({ state: "visible", timeout: 25_000 });
  await staticStage("collection-settled-no-failure", async () => {
    await expect
      .poll(
        () =>
          page.evaluate(() => ({
            routeErrorCount: document.querySelectorAll(
              '[data-s232f4a-route-state="error"]',
            ).length,
            routeLoadingCount: document.querySelectorAll(
              '[data-s232f4a-route-state="loading"]',
            ).length,
            systemFailureCount: document.querySelectorAll(
              '[data-v3-system-state="error"], [data-v3-system-state="offline"]',
            ).length,
            systemLoadingCount: document.querySelectorAll(
              '[data-v3-system-state="loading"]',
            ).length,
            visibleHeadingCount: Array.from(document.querySelectorAll("main h1")).filter(
              (element) => {
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                return (
                  rect.width > 0 &&
                  rect.height > 0 &&
                  style.visibility !== "hidden"
                );
              },
            ).length,
          })),
        { timeout: 20_000 },
      )
      .toEqual({
        routeErrorCount: 0,
        routeLoadingCount: 0,
        systemFailureCount: 0,
        systemLoadingCount: 0,
        visibleHeadingCount: 1,
      });
  });
}

async function scanAxe(page: Page) {
  const count = await staticStage("axe-scan", async () => {
    const result = await new AxeBuilder({ page })
      .include("body")
      .exclude("vercel-live-feedback")
      .exclude("nextjs-portal")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    return result.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    ).length;
  });
  requireTruth(count === 0, "axe-blocking-count");
  return 1;
}

async function settleOwnedPage(page: Page) {
  await staticStage("owned-page-settle", () =>
    page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    }),
  );
}

async function figmaFoundationProbe(page: Page, viewportWidth: number) {
  await settleOwnedPage(page);
  const probe = await staticStage("figma-foundation-probe", () =>
    page.evaluate(async (width) => {
      await Promise.all([
        document.fonts.load('16px "Noto Sans KR Variable"', "답안길"),
        document.fonts.load('17px "Noto Serif KR Variable"', "학습 근거"),
        document.fonts.load('13px "IBM Plex Mono"', "123.45"),
      ]);
      const root = getComputedStyle(document.documentElement);
      const visible = (element: Element) => {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0"
        );
      };
      const controls = Array.from(
        document.querySelectorAll<HTMLElement>(
          'main a[href], main button, main input, main textarea, main select, main summary',
        ),
      ).filter(visible);
      const heading = Array.from(document.querySelectorAll<HTMLElement>("main h1")).find(visible);
      const knownComponents = new Set([
        "StateChip",
        "TrustEvidenceBar",
        "BiggestGap",
        "EvidenceExcerpt",
        "StickyAction",
        "CalculatorStep",
        "FailureAwareState",
      ]);
      const unknownV3ComponentCount = Array.from(
        document.querySelectorAll<HTMLElement>("[data-v3-component]"),
      ).filter((element) => !knownComponents.has(element.dataset.v3Component ?? "")).length;
      return {
        pageEdge: root.getPropertyValue("--layout-page-edge").trim(),
        contentMax: root.getPropertyValue("--layout-content-max").trim(),
        readingColumn: root.getPropertyValue("--layout-reading-column").trim(),
        evidenceRail: root.getPropertyValue("--layout-evidence-rail").trim(),
        controlRadius: root.getPropertyValue("--v3-radius-control").trim(),
        cardRadius: root.getPropertyValue("--v3-radius-card").trim(),
        panelRadius: root.getPropertyValue("--v3-radius-panel").trim(),
        touchTarget: root.getPropertyValue("--touch-target-min").trim(),
        controlHeight: root.getPropertyValue("--control-height").trim(),
        backgroundCanvas: root.getPropertyValue("--bg-canvas").trim().toLowerCase(),
        textPrimary: root.getPropertyValue("--text-primary").trim().toLowerCase(),
        focusCue: root.getPropertyValue("--cue-focus").trim().toLowerCase(),
        theme: document.documentElement.dataset.theme,
        language: document.documentElement.lang,
        fonts: {
          ui: document.fonts.check('16px "Noto Sans KR Variable"', "답안길"),
          prose: document.fonts.check('17px "Noto Serif KR Variable"', "학습 근거"),
          mono: document.fonts.check('13px "IBM Plex Mono"', "123.45"),
        },
        headingFamily: heading ? getComputedStyle(heading).fontFamily : "",
        headingColor: heading ? getComputedStyle(heading).color : "",
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        largeControlCount: controls.filter(
          (element) => element.getBoundingClientRect().height >= 44,
        ).length,
        unknownV3ComponentCount,
        expectedPageEdge: width >= 768 ? "32px" : "20px",
      };
    }, viewportWidth),
  );
  requireTruth(probe.pageEdge === probe.expectedPageEdge, "figma-page-edge-token");
  requireTruth(
    probe.contentMax === "1120px" &&
      probe.readingColumn === "680px" &&
      probe.evidenceRail === "288px",
    "figma-layout-tokens",
  );
  requireTruth(
    probe.controlRadius === "12px" &&
      probe.cardRadius === "14px" &&
      probe.panelRadius === "16px" &&
      probe.touchTarget === "44px" &&
      probe.controlHeight === "52px",
    "figma-radius-control-tokens",
  );
  requireTruth(
    probe.backgroundCanvas === "#f7f6f3" &&
      probe.textPrimary === "#141821" &&
      probe.focusCue === "#2b5c9a",
    "figma-semantic-color-tokens",
  );
  requireTruth(
    probe.theme === "light" &&
      probe.language === "ko" &&
      probe.fonts.ui &&
      probe.fonts.prose &&
      probe.fonts.mono &&
      probe.headingFamily.includes("Noto Sans KR Variable") &&
      probe.headingColor === "rgb(20, 24, 33)" &&
      probe.bodyBackground === "rgb(247, 246, 243)",
    "figma-language-type-contract",
  );
  requireTruth(
    probe.largeControlCount >= 1 &&
      probe.unknownV3ComponentCount === 0,
    "figma-control-component-contract",
  );
}

async function studyLedgerFigmaProbe(page: Page, viewportWidth: number) {
  const probe = await staticStage("figma-study-ledger-frame-probe", () =>
    page.evaluate((width) => {
      const detail = document.querySelector<HTMLElement>("[data-s228-study-ledger-detail]");
      const workspace = detail?.querySelector<HTMLElement>("[data-s232d2-ledger-workspace]");
      const reading = detail?.querySelector<HTMLElement>("[data-s232d2-reading-column]");
      const rail = detail?.querySelector<HTMLElement>("[data-s232d2-evidence-rail]");
      const sticky = detail?.querySelector<HTMLElement>('[data-v3-component="StickyAction"]');
      const control = sticky?.querySelector<HTMLElement>("[data-s228-primary-action]");
      const status = sticky?.querySelector<HTMLElement>('[role="status"]');
      const heading = detail?.querySelector<HTMLElement>('[data-v3-typography-role="heading-screen"]');
      const prose = detail?.querySelector<HTMLElement>('[data-v3-typography-role="prose"]');
      const chrome = document.querySelector<HTMLElement>("[data-s232d1-ledger-chrome]");
      const mobileChrome = chrome?.querySelector<HTMLElement>("[data-s232d1-mobile-chrome]");
      const desktopChrome = chrome?.querySelector<HTMLElement>("[data-s232d1-desktop-chrome]");
      const back = chrome?.querySelector<HTMLElement>("[data-s232d1-ledger-back]");
      const breadcrumb = chrome?.querySelector<HTMLElement>("[data-s232d1-ledger-breadcrumb]");
      if (!detail || !workspace || !reading || !rail || !sticky || !control || !status || !heading || !prose || !chrome || !mobileChrome || !desktopChrome || !back || !breadcrumb) {
        return null;
      }
      const workspaceStyle = getComputedStyle(workspace);
      const stickyStyle = getComputedStyle(sticky);
      const readingRect = reading.getBoundingClientRect();
      const railRect = rail.getBoundingClientRect();
      const stickyRect = sticky.getBoundingClientRect();
      const controlRect = control.getBoundingClientRect();
      const statusRect = status.getBoundingClientRect();
      return {
        width,
        workspaceTracks: workspaceStyle.gridTemplateColumns
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map(Number.parseFloat),
        workspaceGap: Number.parseFloat(workspaceStyle.columnGap),
        readingWidth: readingRect.width,
        railWidth: railRect.width,
        stickyPosition: stickyStyle.position,
        stickyWidth: stickyRect.width,
        stickyHeight: stickyRect.height,
        controlWidth: controlRect.width,
        controlHeight: controlRect.height,
        statusHeight: statusRect.height,
        headingFamily: getComputedStyle(heading).fontFamily,
        proseFamily: getComputedStyle(prose).fontFamily,
        proseSize: getComputedStyle(prose).fontSize,
        proseLine: getComputedStyle(prose).lineHeight,
        stateChipCount: detail.querySelectorAll('[data-v3-component="StateChip"]').length,
        trustCount: detail.querySelectorAll('[data-v3-component="TrustEvidenceBar"]').length,
        gapCount: detail.querySelectorAll('[data-v3-component="BiggestGap"]').length,
        stickyCount: detail.querySelectorAll('[data-v3-component="StickyAction"]').length,
        learnerEvidenceCount: detail.querySelectorAll(
          '[data-s232d2-learner-evidence] [data-v3-component="EvidenceExcerpt"]',
        ).length,
        chromeHeight: chrome.getBoundingClientRect().height,
        chromeMobileNode: chrome.dataset.v3MobileNode,
        chromeDesktopNode: chrome.dataset.v3DesktopNode,
        mobileChromeDisplay: getComputedStyle(mobileChrome).display,
        desktopChromeDisplay: getComputedStyle(desktopChrome).display,
        backWidth: back.getBoundingClientRect().width,
        backHeight: back.getBoundingClientRect().height,
        backHref: back.getAttribute("href"),
        breadcrumbVisible:
          breadcrumb.getBoundingClientRect().width > 0 &&
          breadcrumb.getBoundingClientRect().height > 0,
        breadcrumbCopy: breadcrumb.textContent?.trim(),
      };
    }, viewportWidth),
  );
  requireTruth(probe, "figma-study-ledger-required-elements");
  requireTruth(
    probe.stateChipCount === 1 &&
      probe.trustCount === 1 &&
      probe.gapCount === 1 &&
      probe.stickyCount === 1 &&
      probe.learnerEvidenceCount === 1,
    "figma-study-ledger-shared-components",
  );
  requireTruth(
    probe.headingFamily.includes("Noto Sans KR Variable") &&
      probe.proseFamily.includes("Noto Serif KR Variable") &&
      probe.proseSize === "17px" &&
      probe.proseLine === "30px",
    "figma-study-ledger-type",
  );
  requireTruth(
    Math.abs(probe.controlHeight - 52) <= 1 && Math.abs(probe.statusHeight - 18) <= 1,
    "figma-study-ledger-control-geometry",
  );
  requireTruth(
    probe.chromeMobileNode === "56:3" &&
      probe.chromeDesktopNode === "59:63" &&
      probe.backHref === "/app/notes?mode=second" &&
      probe.breadcrumbCopy?.startsWith("학습 노트 / ") === true,
    "figma-study-ledger-chrome-contract",
  );
  if (viewportWidth < 1024) {
    const expectedReadingWidth = viewportWidth - 40;
    requireTruth(
      probe.workspaceTracks.length === 1 &&
        Math.abs(probe.readingWidth - expectedReadingWidth) <= 1 &&
        probe.stickyPosition === "fixed" &&
        Math.abs(probe.stickyWidth - viewportWidth) <= 1 &&
        probe.stickyHeight >= 116 &&
        Math.abs(probe.controlWidth - expectedReadingWidth) <= 1,
      "figma-study-ledger-mobile-tablet-frame",
    );
    requireTruth(
      Math.abs(probe.chromeHeight - 56) <= 1 &&
        probe.mobileChromeDisplay === "grid" &&
        probe.desktopChromeDisplay === "none" &&
        Math.abs(probe.backWidth - 44) <= 1 &&
        Math.abs(probe.backHeight - 44) <= 1 &&
        !probe.breadcrumbVisible,
      "figma-study-ledger-mobile-chrome",
    );
  } else {
    requireTruth(
      probe.workspaceTracks.length === 2 &&
        Math.abs(probe.workspaceTracks[0]! - 680) <= 1 &&
        Math.abs(probe.workspaceTracks[1]! - 288) <= 1 &&
        Math.abs(probe.workspaceGap - 32) <= 1 &&
        Math.abs(probe.readingWidth - 680) <= 1 &&
        Math.abs(probe.railWidth - 288) <= 1 &&
        probe.stickyPosition === "static" &&
        Math.abs(probe.stickyWidth - 300) <= 1 &&
        probe.stickyHeight >= 84 &&
        Math.abs(probe.controlWidth - 300) <= 1,
      "figma-study-ledger-desktop-frame",
    );
    requireTruth(
      Math.abs(probe.chromeHeight - 72) <= 1 &&
        probe.mobileChromeDisplay === "none" &&
        probe.desktopChromeDisplay === "flex" &&
        probe.backWidth === 0 &&
        probe.backHeight === 0 &&
        probe.breadcrumbVisible,
      "figma-study-ledger-desktop-chrome",
    );
  }
}

async function calculatorStepFigmaProbe(page: Page) {
  const trainer = page.locator(
    '[data-s232g-route="calculator"] [data-calculator-routine-trainer]',
  );
  await trainer.waitFor({ state: "visible", timeout: 25_000 });
  await trainer
    .getByRole("button", { name: "계산형 문제라면 루틴 시작", exact: true })
    .click();

  const entries = {
    conditions: "합성 조건을 직접 확인했습니다.",
    formula: "A = B × C 합성 산식을 직접 기록했습니다.",
    numbers_units: "합성 값 100원과 2회를 직접 확인했습니다.",
    casio_input: "100 × 2 EXE 합성 키 순서를 직접 기록했습니다.",
    display_value: "합성 화면값 200을 직접 기록했습니다.",
    answer_value: "합성 답안 기재값 200원을 직접 기록했습니다.",
  } as const;
  for (const stepId of ["conditions", "formula", "numbers_units"] as const) {
    const active = trainer.locator(`[data-calculator-routine-active-step="${stepId}"]`);
    await active.waitFor({ state: "visible", timeout: 20_000 });
    await active.locator("textarea").fill(entries[stepId]);
    await trainer.getByRole("button", { name: /^다음 · / }).click();
  }

  const keyInput = trainer.locator(
    '[data-calculator-routine-active-step="casio_input"] ' +
      '[data-testid="calculator-step-runner-v3"]',
  );
  await keyInput.waitFor({ state: "visible", timeout: 20_000 });
  const widths = [
    ...S232G_VIEWPORTS.map((viewport) => ({
      width: viewport.width,
      height: viewport.height,
    })),
    {
      width: S232G_WIDTH_EQUIVALENT_VIEWPORT.width,
      height: S232G_WIDTH_EQUIVALENT_VIEWPORT.height,
    },
  ];
  for (const viewport of widths) {
    await page.setViewportSize(viewport);
    await settleOwnedPage(page);
    const probe = await staticStage("calculator-step-figma-probe", () =>
      keyInput.evaluate((element, viewportWidth) => {
        const shell = element as HTMLElement;
        const shellStyle = getComputedStyle(shell);
        const display = shell.querySelector<HTMLElement>("[data-calculator-step-display]");
        const displayOutput = display?.querySelector<HTMLOutputElement>("output");
        const keyRegion = shell.querySelector<HTMLElement>(
          "[data-calculator-step-key-sequence]",
        );
        const keyCode = keyRegion?.querySelector<HTMLElement>("code");
        const hint = shell.querySelector<HTMLElement>("[data-calculator-step-hint]");
        const verification = shell.querySelector<HTMLElement>(
          "[data-calculator-step-verification]",
        );
        if (!display || !displayOutput || !keyRegion || !keyCode || !hint || !verification) {
          return null;
        }
        const displayStyle = getComputedStyle(display);
        const outputStyle = getComputedStyle(displayOutput);
        const keyStyle = getComputedStyle(keyRegion);
        const keyCodeStyle = getComputedStyle(keyCode);
        return {
          viewportWidth,
          component: shell.getAttribute("data-v3-component"),
          step: shell.getAttribute("data-v3-step"),
          state: shell.getAttribute("data-v3-state"),
          ariaLabel: shell.getAttribute("aria-label"),
          deviceVerified: shell.getAttribute("data-device-verified"),
          stateLabelVisible: shell.getAttribute("data-state-label-visible"),
          verification: verification.textContent?.trim(),
          descendantTabStopCount: shell.querySelectorAll(
            'a[href],button,input,textarea,select,[tabindex]:not([tabindex="-1"])',
          ).length,
          width: shell.getBoundingClientRect().width,
          minHeight: Number.parseFloat(shellStyle.minHeight),
          padding: shellStyle.padding,
          gap: shellStyle.gap,
          radius: shellStyle.borderRadius,
          outlineWidth: shellStyle.outlineWidth,
          outlineOffset: shellStyle.outlineOffset,
          background: shellStyle.backgroundColor,
          outlineColor: shellStyle.outlineColor,
          displayHeight: display.getBoundingClientRect().height,
          displayWidth: display.getBoundingClientRect().width,
          displayRadius: displayStyle.borderRadius,
          displayPadding: displayStyle.padding,
          displayBackground: displayStyle.backgroundColor,
          outputFamily: outputStyle.fontFamily,
          outputSize: outputStyle.fontSize,
          outputLine: outputStyle.lineHeight,
          keyHeight: keyRegion.getBoundingClientRect().height,
          keyWidth: keyRegion.getBoundingClientRect().width,
          keyRadius: keyStyle.borderRadius,
          keyPadding: keyStyle.padding,
          keyFamily: keyCodeStyle.fontFamily,
          keySize: keyCodeStyle.fontSize,
          keyLine: keyCodeStyle.lineHeight,
          hintHeight: hint.getBoundingClientRect().height,
          hintWidth: hint.getBoundingClientRect().width,
        };
      }, viewport.width),
    );
    requireTruth(probe, "calculator-step-elements");
    requireTruth(
      probe.component === "CalculatorStep" &&
        probe.step === "KeyInput" &&
        probe.state === "Current" &&
        probe.ariaLabel === "4 / 9 · CASIO 입력 · 현재 단계" &&
        probe.deviceVerified === "false" &&
        probe.stateLabelVisible === "false" &&
        probe.verification === "기기 검증 전" &&
        probe.descendantTabStopCount === 0,
      "calculator-step-current-contract",
    );
    requireTruth(
      probe.padding === "24px" &&
        probe.gap === "12px" &&
        probe.radius === "16px" &&
        probe.outlineWidth === "1px" &&
        probe.outlineOffset === "-1px" &&
        probe.background === "rgb(237, 244, 252)" &&
        probe.outlineColor === "rgb(43, 92, 154)",
      "calculator-step-shell-style",
    );
    requireTruth(
      (viewport.width < 640 ? probe.minHeight === 380 : probe.minHeight === 350) &&
        Math.abs(probe.width - (viewport.width < 640 ? 350 : 552)) <= 1,
      "calculator-step-shell-geometry",
    );
    requireTruth(
      probe.displayHeight >= 124 &&
        Math.abs(probe.displayWidth - (viewport.width < 640 ? 302 : 504)) <= 1 &&
        probe.displayRadius === "12px" &&
        probe.displayPadding === "16px" &&
        probe.displayBackground === "rgb(16, 35, 63)" &&
        probe.outputFamily.includes("IBM Plex Mono") &&
        probe.outputSize === "28px" &&
        probe.outputLine === "36px",
      "calculator-step-display-contract",
    );
    requireTruth(
      probe.keyHeight >= 66 &&
        Math.abs(probe.keyWidth - (viewport.width < 640 ? 302 : 504)) <= 1 &&
        probe.keyRadius === "12px" &&
        probe.keyPadding === "12px" &&
        probe.keyFamily.includes("IBM Plex Mono") &&
        probe.keySize === "13px" &&
        probe.keyLine === "20px" &&
        probe.hintHeight >= 46 &&
        Math.abs(probe.hintWidth - (viewport.width < 640 ? 302 : 504)) <= 1,
      "calculator-step-key-hint-contract",
    );
  }

  const keyInputTextarea = trainer.locator(
    '[data-calculator-routine-active-step="casio_input"] textarea',
  );
  await keyInputTextarea.fill(entries.casio_input);
  await staticStage("calculator-key-input-complete", async () => {
    await expect(keyInput).toHaveAttribute("data-v3-state", "Complete");
    await expect(keyInput).toHaveAttribute(
      "aria-label",
      "4 / 9 · CASIO 입력 · 확인 완료",
    );
  });
  await trainer.getByRole("button", { name: /^다음 · / }).click();

  const display = trainer.locator(
    '[data-calculator-routine-active-step="display_value"] ' +
      '[data-testid="calculator-step-runner-v3"]',
  );
  await staticStage("calculator-display-current", async () => {
    await expect(display).toHaveAttribute("data-v3-step", "Display");
    await expect(display).toHaveAttribute("data-v3-state", "Current");
  });
  await trainer
    .locator('[data-calculator-routine-active-step="display_value"] textarea')
    .fill(entries.display_value);
  await staticStage("calculator-display-complete", () =>
    expect(display).toHaveAttribute("data-v3-state", "Complete"),
  );
  await trainer.getByRole("button", { name: /^다음 · / }).click();

  const transfer = trainer.locator(
    '[data-calculator-routine-active-step="answer_value"] ' +
      '[data-testid="calculator-step-runner-v3"]',
  );
  await staticStage("calculator-transfer-current", async () => {
    await expect(transfer).toHaveAttribute("data-v3-step", "Transfer");
    await expect(transfer).toHaveAttribute("data-v3-state", "Current");
  });
  await trainer
    .locator('[data-calculator-routine-active-step="answer_value"] textarea')
    .fill(entries.answer_value);
  await staticStage("calculator-transfer-complete", () =>
    expect(transfer).toHaveAttribute("data-v3-state", "Complete"),
  );
}

async function layoutProbe(page: Page, readySelector: string, keyboardSelector: string) {
  await settleOwnedPage(page);
  return staticStage("layout-probe", () =>
    page.evaluate(
      ({ rootSelector, targetSelector }) => {
        const visible = (element: Element) => {
          if (!(element instanceof HTMLElement)) return false;
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0"
          );
        };
        const root = Array.from(document.querySelectorAll(rootSelector)).find(visible);
        const headings = Array.from(document.querySelectorAll("main h1")).filter(visible);
        const target = Array.from(document.querySelectorAll(targetSelector)).find(visible);
        const horizontalOverflow = Math.max(
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
          document.body.scrollWidth - document.body.clientWidth,
        ) > 1;
        const ownedShell =
          document.querySelector<HTMLElement>("[data-learner-shell]") ??
          document.querySelector<HTMLElement>("main") ??
          root;
        const coreCandidates = ownedShell
          ? Array.from(
              ownedShell.querySelectorAll<HTMLElement>(
                'main, section, article, form, h1, h2, h3, a[href], button, input, textarea, select, summary, [role="status"]',
              ),
            ).filter(visible)
          : [];
        const scrollCandidates = root ? [root, ...Array.from(root.querySelectorAll("*"))] : [];
        const nestedTwoDimensionalScrollCount = root
          ? scrollCandidates.filter((element) => {
              if (!visible(element) || element.matches("textarea, pre, code")) return false;
              const html = element as HTMLElement;
              const style = getComputedStyle(html);
              const scrollsX =
                (style.overflowX === "auto" || style.overflowX === "scroll") &&
                html.scrollWidth - html.clientWidth > 1;
              const scrollsY =
                (style.overflowY === "auto" || style.overflowY === "scroll") &&
                html.scrollHeight - html.clientHeight > 1;
              return scrollsX && scrollsY;
            }).length
          : 1;
        const clippedCoreContentCount = coreCandidates.filter((element) => {
            const rect = element.getBoundingClientRect();
            if (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1) {
              return true;
            }
            let ancestor = element.parentElement;
            while (ancestor && ancestor !== document.body) {
              const style = getComputedStyle(ancestor);
              const ancestorRect = ancestor.getBoundingClientRect();
              const clipsX = style.overflowX === "hidden" || style.overflowX === "clip";
              const clipsY = style.overflowY === "hidden" || style.overflowY === "clip";
              if (
                (clipsX && (rect.left < ancestorRect.left - 1 || rect.right > ancestorRect.right + 1)) ||
                (clipsY && (rect.top < ancestorRect.top - 1 || rect.bottom > ancestorRect.bottom + 1))
              ) {
                return true;
              }
              ancestor = ancestor.parentElement;
            }
            return false;
          }).length;
        return {
          ready: Boolean(root && target && ownedShell),
          visibleHeadingCount: headings.length,
          horizontalOverflow,
          nestedTwoDimensionalScrollCount,
          clippedCoreContentCount,
          coreContentCount: coreCandidates.length,
        };
      },
      { rootSelector: readySelector, targetSelector: keyboardSelector },
    ),
  );
}

async function skipLinkProbe(page: Page, routePathname: string) {
  const expectedHref =
    routePathname === "/answer-review"
      ? "#answer-review-main"
      : routePathname === "/app/items/[itemId]"
        ? "#study-ledger-content"
        : "#learner-main";
  const prepared = await staticStage("skip-link-prepare", () =>
    page.evaluate(() => {
      document.querySelector("[data-s232g-skip-wrap-sentinel]")?.remove();
      const sentinel = document.createElement("button");
      sentinel.type = "button";
      sentinel.tabIndex = 0;
      sentinel.setAttribute("aria-label", "순차 포커스 시작점 확인");
      sentinel.setAttribute("data-s232g-skip-wrap-sentinel", "true");
      Object.assign(sentinel.style, {
        position: "fixed",
        width: "1px",
        height: "1px",
        inset: "auto 0 0 auto",
        opacity: "0",
        pointerEvents: "none",
      });
      document.body.appendChild(sentinel);
      sentinel.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      return document.activeElement === sentinel;
    }),
  );
  requireTruth(prepared, "skip-link-wrap-sentinel-focus");
  await staticStage("skip-link-first-tab", () => page.keyboard.press("Tab"));
  const focused = await staticStage("skip-link-focused", () =>
    page.evaluate((href) => {
      const active = document.activeElement;
      document.querySelector("[data-s232g-skip-wrap-sentinel]")?.remove();
      if (!(active instanceof HTMLAnchorElement)) return null;
      const rect = active.getBoundingClientRect();
      return {
        href: active.getAttribute("href"),
        focusVisible: active.matches(":focus-visible"),
        visible:
          rect.width > 0 &&
          rect.height >= 44 &&
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.right <= window.innerWidth,
        exact: active.getAttribute("href") === href,
      };
    }, expectedHref),
  );
  requireTruth(
    focused?.exact && focused.href === expectedHref && focused.focusVisible && focused.visible,
    "skip-link-first-visible-focus",
  );
  await staticStage("skip-link-activate", () => page.keyboard.press("Enter"));
  const landed = await staticStage("skip-link-target", () =>
    page.evaluate((href) => {
      const target = document.querySelector<HTMLElement>(href);
      return Boolean(
        target &&
          document.activeElement === target &&
          target.getBoundingClientRect().top < window.innerHeight,
      );
    }, expectedHref),
  );
  requireTruth(landed, "skip-link-exact-target");
}

async function keyboardFocusProbe(page: Page, preferredSelector: string) {
  const prepared = await staticStage("keyboard-target-prepare", () =>
    page.evaluate((selector) => {
      const visible = (element: Element) => {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          rect.width > 0 && rect.height > 0 &&
          style.display !== "none" && style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          !element.matches(":disabled") &&
          !element.closest('[inert], [aria-hidden="true"], vercel-live-feedback, nextjs-portal')
        );
      };
      const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));
      const target = candidates.find(visible);
      if (!target) return false;
      target.setAttribute("data-s232g-keyboard-probe", "target");
      const focusables = Array.from(document.querySelectorAll<HTMLElement>(
        'body a[href], body button, body input, body textarea, body select, body summary, body [tabindex]:not([tabindex="-1"])',
      ))
        .filter((element) => visible(element) && element.tabIndex >= 0)
        .map((element, domIndex) => ({ element, domIndex, tabIndex: element.tabIndex }))
        .sort((left, right) => {
          const leftPositive = left.tabIndex > 0;
          const rightPositive = right.tabIndex > 0;
          if (leftPositive !== rightPositive) return leftPositive ? -1 : 1;
          if (leftPositive && left.tabIndex !== right.tabIndex) return left.tabIndex - right.tabIndex;
          return left.domIndex - right.domIndex;
        })
        .map(({ element }) => element);
      if (!focusables.includes(target)) return false;
      focusables.forEach((element, index) => {
        element.setAttribute("data-s232g-tab-order", String(index));
      });
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      window.scrollTo(0, 0);
      return { count: focusables.length, targetOrder: focusables.indexOf(target) };
    }, preferredSelector),
  );
  requireTruth(prepared, "keyboard-target-present");

  const before = await staticStage("keyboard-style-before", () =>
    page.locator('[data-s232g-keyboard-probe="target"]').evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outline: `${style.outlineWidth}|${style.outlineStyle}|${style.outlineColor}`,
        boxShadow: style.boxShadow,
        borderColor: style.borderColor,
        backgroundColor: style.backgroundColor,
      };
    }),
  );
  const forwardPrepared = await staticStage("keyboard-forward-prepare", () =>
    page.evaluate(() => {
      const ordered = Array.from(
        document.querySelectorAll<HTMLElement>("[data-s232g-tab-order]"),
      ).sort(
        (left, right) =>
          Number(left.dataset.s232gTabOrder) - Number(right.dataset.s232gTabOrder),
      );
      const last = ordered.at(-1);
      last?.focus();
      return Boolean(last && document.activeElement === last);
    }),
  );
  requireTruth(forwardPrepared, "keyboard-forward-start-sentinel");
  let reached = false;
  let completedForwardCycle = false;
  const visited = new Set<number>();
  let lastOrder = -1;
  let focusedEvidence:
    | (typeof before & {
        focused: boolean;
        focusVisible: boolean;
        visibleInViewport: boolean;
        interactiveControlContract: boolean;
      })
    | null = null;
  for (let step = 0; step < prepared.count + 8; step += 1) {
    await staticStage("keyboard-tab", () => page.keyboard.press("Tab"));
    const state = await staticStage("keyboard-step-state", () =>
      page.evaluate(() => {
        const active = document.activeElement;
        return {
          reached: active?.getAttribute("data-s232g-keyboard-probe") === "target",
          order: Number(active?.getAttribute("data-s232g-tab-order") ?? -1),
        };
      }),
    );
    if (state.order >= 0) {
      if (visited.has(state.order)) {
        completedForwardCycle =
          visited.size === prepared.count && state.order === 0;
        break;
      }
      requireTruth(state.order > lastOrder, "keyboard-forward-logical-order");
      visited.add(state.order);
      lastOrder = state.order;
      if (state.reached) {
        reached = true;
        focusedEvidence = await staticStage("keyboard-focused-evidence", () =>
          page.locator('[data-s232g-keyboard-probe="target"]').evaluate((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            const html = element as HTMLElement;
            return {
              focused: document.activeElement === element,
              focusVisible: element.matches(":focus-visible"),
              visibleInViewport:
                rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 &&
                rect.top < window.innerHeight && rect.left < window.innerWidth,
              interactiveControlContract:
                (html.tagName === "A" && Boolean((html as HTMLAnchorElement).href)) ||
                html.tagName === "BUTTON" ||
                html.tagName === "INPUT" ||
                html.tagName === "TEXTAREA" ||
                html.tagName === "SELECT" ||
                html.tagName === "SUMMARY",
              outline: `${style.outlineWidth}|${style.outlineStyle}|${style.outlineColor}`,
              boxShadow: style.boxShadow,
              borderColor: style.borderColor,
              backgroundColor: style.backgroundColor,
            };
          }),
        );
      }
    } else if (visited.size === prepared.count) {
      completedForwardCycle = true;
      break;
    }
  }
  requireTruth(
    reached && completedForwardCycle && visited.size === prepared.count,
    "keyboard-forward-complete-no-trap",
  );

  const reversePrepared = await staticStage("keyboard-reverse-prepare", () =>
    page.evaluate(() => {
      const ordered = Array.from(
        document.querySelectorAll<HTMLElement>("[data-s232g-tab-order]"),
      ).sort(
        (left, right) =>
          Number(left.dataset.s232gTabOrder) - Number(right.dataset.s232gTabOrder),
      );
      ordered.at(-1)?.focus();
      return ordered.length;
    }),
  );
  requireTruth(reversePrepared === prepared.count, "keyboard-reverse-registry");
  const reverseVisited = new Set<number>([prepared.count - 1]);
  let reverseLastOrder = prepared.count - 1;
  let completedReverseCycle = false;
  for (let step = 0; step < prepared.count + 8; step += 1) {
    await staticStage("keyboard-shift-tab", () => page.keyboard.press("Shift+Tab"));
    const order = await staticStage("keyboard-reverse-state", () =>
      page.evaluate(() => Number((document.activeElement as HTMLElement | null)?.dataset.s232gTabOrder ?? -1)),
    );
    if (order >= 0) {
      if (reverseVisited.has(order)) {
        completedReverseCycle =
          reverseVisited.size === prepared.count && order === prepared.count - 1;
        break;
      }
      requireTruth(order < reverseLastOrder, "keyboard-reverse-logical-order");
      reverseVisited.add(order);
      reverseLastOrder = order;
    } else if (reverseVisited.size === prepared.count) {
      completedReverseCycle = true;
      break;
    }
  }
  requireTruth(
    completedReverseCycle && reverseVisited.size === prepared.count,
    "keyboard-reverse-complete-no-trap",
  );

  requireTruth(
    Boolean(
      focusedEvidence?.focused &&
        focusedEvidence.focusVisible &&
        focusedEvidence.visibleInViewport &&
        focusedEvidence.interactiveControlContract,
    ),
    "keyboard-visible-focus-interactive-control",
  );
  requireTruth(
    before.outline !== focusedEvidence?.outline ||
      before.boxShadow !== focusedEvidence?.boxShadow ||
      before.borderColor !== focusedEvidence?.borderColor ||
      before.backgroundColor !== focusedEvidence?.backgroundColor,
    "keyboard-focus-style-delta",
  );
  await staticStage("keyboard-target-cleanup", () =>
    page.evaluate(() => {
      document.querySelectorAll("[data-s232g-keyboard-probe]").forEach((element) =>
        element.removeAttribute("data-s232g-keyboard-probe"));
      document.querySelectorAll("[data-s232g-tab-order]").forEach((element) =>
        element.removeAttribute("data-s232g-tab-order"));
    }),
  );
}

async function closeContext(
  context: BrowserContext,
  phase: RuntimePhaseState,
) {
  await staticStage("context-cleanup", async () => {
    phase.current = "cleanup";
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        context.close(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error("cleanup-timeout")), 10_000);
        }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  });
}

async function newIsolatedContext(browser: Browser) {
  return browser.newContext({
    baseURL: runtimeBaseUrl,
    serviceWorkers: "block",
  });
}

function sumCounters(counters: readonly RuntimeCounters[], key: keyof RuntimeCounters) {
  return counters.reduce((total, entry) => total + entry[key], 0);
}

test("S232G final aggregate exact-head authenticated parity", async ({ browser, page }, testInfo: TestInfo) => {
  await staticStage("runtime-preflight", async () => {
    requireSafeAuthenticatedRuntime("S232G", {
      requireTargetSha: true,
      requireExactHead: true,
    });
    requireTwoAccounts();
    requireRunNonce();
  });

  await staticStage("durable-flow-mobile-viewport", () =>
    page.setViewportSize({ width: 390, height: 844 }),
  );

  const mainCounters = createRuntimeCounters();
  const mainPhase = createRuntimePhaseState();
  await staticStage("main-runtime-guard", () =>
    installPrivacySafeRuntimeGuard(page.context(), page, mainCounters, mainPhase),
  );
  await staticStage("protected-preview-main", () => establishProtectedPreviewSession(page, "S232G"));
  mainPhase.current = "auth-navigation";
  try {
    await staticStage("primary-login", () => loginWithDedicatedTestAccount(page, "second"));
  } finally {
    mainPhase.current = "normal";
  }
  const accountAUserId = await authenticatedIdentity(page);
  const beforeSha = await observedDeploymentSha(page);
  requireTruth(
    beforeSha.status === 200 && beforeSha.ready && beforeSha.deploymentSha === runtimeTargetSha,
    "pre-runtime-sha",
  );

  const source = await createSyntheticSourceThroughCapture(page, accountAUserId);
  requireTruth(
    await sourceDetailProbe(page, source.id, accountAUserId),
    "capture-source-owner-binding",
  );
  requireTruth(
    await reviewQueueMembershipProbe(page, source.id),
    "capture-source-review-queue",
  );
  const rewrittenItemId = await performDurableRewrite(page, source.id);
  requireTruth(
    await rewriteBindingProbe(page, rewrittenItemId, source.id, accountAUserId),
    "rewrite-source-exact-binding",
  );
  await continueSavedCaptureToReview(page);
  requireTruth(
    await reviewQueueMembershipProbe(page, rewrittenItemId),
    "rewrite-review-queue",
  );
  requireTruth(
    await todayFocusMembershipProbe(page, rewrittenItemId),
    "rewrite-today-focus-input",
  );
  await navigateFixed(
    page,
    "/app?mode=second",
    '[data-s232d5-today-page="single-priority"]',
  );
  requireTruth(await durableComparisonProbe(page, rewrittenItemId), "rewrite-before-after");
  await staticStage("durable-reload", () => page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 }));
  await staticStage("durable-reload-ready", () =>
    page.locator("[data-s228-study-ledger-detail]").waitFor({ state: "visible", timeout: 25_000 }),
  );
  requireTruth(
    await durableComparisonProbe(page, rewrittenItemId),
    "rewrite-reload-durability",
  );
  requireTruth(await notesRoundTripProbe(page, rewrittenItemId), "notes-round-trip");
  requireTruth(await ownerDetailProbe(page, rewrittenItemId, accountAUserId), "owner-positive-before");
  await requireSyntheticUsageDelta(page, source.monthlyUsedBefore);

  const secondaryCounters = createRuntimeCounters();
  const secondaryPhase = createRuntimePhaseState();
  const secondaryContext = await newIsolatedContext(browser);
  const secondaryPage = await secondaryContext.newPage();
  await staticStage("secondary-mobile-viewport", () =>
    secondaryPage.setViewportSize({ width: 390, height: 844 }),
  );
  await staticStage("secondary-runtime-guard", () =>
    installPrivacySafeRuntimeGuard(
      secondaryContext,
      secondaryPage,
      secondaryCounters,
      secondaryPhase,
    ),
  );
  try {
    await staticStage("protected-preview-secondary", () =>
      establishProtectedPreviewSession(secondaryPage, "S232G-B"));
    secondaryPhase.current = "auth-navigation";
    try {
      await staticStage("secondary-login", () =>
        loginWithCredentials(secondaryPage, accountBEmail, accountBPassword));
    } finally {
      secondaryPhase.current = "normal";
    }
    const accountBUserId = await authenticatedIdentity(secondaryPage);
    requireTruth(accountBUserId !== accountAUserId, "real-account-identity-distinction");
    requireTruth(
      await crossAccountApiDenialProbe(secondaryPage, source.id),
      "cross-account-source-exact-null-api",
    );
    requireTruth(
      await crossAccountApiDenialProbe(secondaryPage, rewrittenItemId),
      "cross-account-rewrite-exact-null-api",
    );
    requireTruth(
      await boundedCollectionAbsenceProbe(
        secondaryPage,
        [source.id, rewrittenItemId],
      ),
      "cross-account-bounded-collection-absence",
    );
    secondaryPhase.current = "expected-cross-account-ui-denial";
    const denialResponse = await staticStage("cross-account-detail-navigation", () =>
      secondaryPage.goto(`/app/items/${encodeURIComponent(rewrittenItemId)}?mode=second`, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      }),
    );
    requireTruth(denialResponse?.status() === 404, "cross-account-detail-exact-404");
    await staticStage("cross-account-detail-stable-denial", () =>
      secondaryPage.locator('#study-ledger-content[data-s228-state="empty"]').waitFor({
        state: "visible",
        timeout: 25_000,
      }),
    );
    const detailDenied = await staticStage("cross-account-detail-ui", () =>
      secondaryPage.evaluate(
        ({ forbiddenParagraph, forbiddenTitle }) => ({
          ledgerCount: document.querySelectorAll("[data-s228-study-ledger-detail]").length,
          denialStateCount: document.querySelectorAll(
            '#study-ledger-content[data-s228-state="empty"]',
          ).length,
          denialCopyPresent: document.body.innerText.includes("이 학습 기록을 찾을 수 없습니다."),
          returnLinkCount: Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]")).filter(
            (link) =>
              link.getAttribute("href") === "/app/items?mode=second" &&
              link.textContent?.trim() === "학습 노트로 돌아가기",
          ).length,
          contentAbsent:
            !document.body.innerText.includes(forbiddenParagraph) &&
            !document.body.innerText.includes(forbiddenTitle),
        }),
        { forbiddenParagraph: rewrittenParagraph, forbiddenTitle: sourceTitle },
      ),
    );
    requireTruth(
      detailDenied.ledgerCount === 0 &&
        detailDenied.denialStateCount === 1 &&
        detailDenied.denialCopyPresent &&
        detailDenied.returnLinkCount === 1 &&
        detailDenied.contentAbsent,
      "cross-account-detail-ui-denial",
    );
    secondaryPhase.current = "normal";

    for (const surface of ["notes", "review", "today"] as const) {
      await navigateSettledCollection(secondaryPage, surface);
      requireTruth(
        await expectNoSyntheticExposure(
          secondaryPage,
          [source.id, rewrittenItemId],
          [sourceTitle, originalParagraph, rewrittenParagraph],
        ),
        "cross-account-collection-absence",
      );
    }
  } finally {
    await closeContext(secondaryContext, secondaryPhase);
  }

  const freshCounters = createRuntimeCounters();
  const freshPhase = createRuntimePhaseState();
  const freshContext = await newIsolatedContext(browser);
  const freshPage = await freshContext.newPage();
  await staticStage("fresh-owner-mobile-viewport", () =>
    freshPage.setViewportSize({ width: 390, height: 844 }),
  );
  await staticStage("fresh-owner-runtime-guard", () =>
    installPrivacySafeRuntimeGuard(freshContext, freshPage, freshCounters, freshPhase),
  );
  try {
    await staticStage("protected-preview-fresh-owner", () =>
      establishProtectedPreviewSession(freshPage, "S232G-A-fresh"));
    freshPhase.current = "auth-navigation";
    try {
      await staticStage("fresh-owner-login", () =>
        loginWithCredentials(freshPage, accountAEmail, accountAPassword));
    } finally {
      freshPhase.current = "normal";
    }
    const freshAccountAUserId = await authenticatedIdentity(freshPage);
    requireTruth(freshAccountAUserId === accountAUserId, "fresh-owner-identity");
    requireTruth(
      await ownerDetailProbe(freshPage, rewrittenItemId, freshAccountAUserId),
      "owner-positive-after",
    );
    requireTruth(
      await rewriteBindingProbe(
        freshPage,
        rewrittenItemId,
        source.id,
        freshAccountAUserId,
      ),
      "fresh-owner-rewrite-source-binding",
    );
    requireTruth(await durableComparisonProbe(freshPage, rewrittenItemId), "fresh-owner-ui-read");
  } finally {
    await closeContext(freshContext, freshPhase);
  }

  for (const alias of S232G_ALIASES) {
    const canonical = S232G_ROUTES.find((route) => route.key === alias.canonicalKey);
    requireTruth(canonical, "alias-canonical-registry");
    await navigateFixed(page, alias.evidenceRoute, canonical.readySelector);
    const redirected = await staticStage("alias-redirect-proof", () =>
      page.evaluate((expectedPathname) => window.location.pathname === expectedPathname, canonical.pathname),
    );
    requireTruth(redirected, "alias-redirect");
  }

  let axeScanCount = 0;
  let visibleHeadingCount = 0;
  let keyboardRouteCount = 0;
  let directFigmaProductFrameRouteCount = 0;
  let directFigmaComponentOnlyRouteCount = 0;
  for (const route of S232G_ROUTES) {
    const href = route.href ?? `/app/items/${encodeURIComponent(rewrittenItemId)}?mode=second`;
    await navigateFixed(page, href, route.readySelector);
    if (route.parityKind === "direct-component-only") {
      requireTruth(route.directFigmaNodes.length === 3, "figma-calculator-node-registry");
      await calculatorStepFigmaProbe(page);
      directFigmaComponentOnlyRouteCount += 1;
    }
    for (const viewport of S232G_VIEWPORTS) {
      await staticStage("viewport-resize", () =>
        page.setViewportSize({ width: viewport.width, height: viewport.height }),
      );
      const layout = await layoutProbe(page, route.readySelector, route.keyboardSelector);
      requireTruth(layout.ready, "route-ready");
      requireTruth(layout.visibleHeadingCount === 1, "route-visible-h1");
      requireTruth(layout.coreContentCount >= 1, "route-core-content-present");
      requireTruth(!layout.horizontalOverflow, "route-horizontal-overflow");
      requireTruth(layout.nestedTwoDimensionalScrollCount === 0, "route-nested-two-dimensional-scroll");
      requireTruth(layout.clippedCoreContentCount === 0, "route-clipped-core-content");
      await figmaFoundationProbe(page, viewport.width);
      if (route.parityKind === "direct-product-frame") {
        requireTruth(route.directFigmaNodes.length === 9, "figma-study-ledger-node-registry");
        await studyLedgerFigmaProbe(page, viewport.width);
      }
      axeScanCount += await scanAxe(page);
    }
    if (route.parityKind === "direct-product-frame") {
      directFigmaProductFrameRouteCount += 1;
    }
    visibleHeadingCount += 1;
    await staticStage("keyboard-viewport", () => page.setViewportSize({ width: 390, height: 844 }));
    await skipLinkProbe(page, route.pathname);
    await keyboardFocusProbe(page, route.keyboardSelector);
    keyboardRouteCount += 1;

    await staticStage("width-equivalent-resize", () =>
      page.setViewportSize({
        width: S232G_WIDTH_EQUIVALENT_VIEWPORT.width,
        height: S232G_WIDTH_EQUIVALENT_VIEWPORT.height,
      }),
    );
    const widthEquivalentLayout = await layoutProbe(page, route.readySelector, route.keyboardSelector);
    requireTruth(!widthEquivalentLayout.horizontalOverflow, "width-equivalent-horizontal-overflow");
    requireTruth(
      widthEquivalentLayout.nestedTwoDimensionalScrollCount === 0,
      "width-equivalent-nested-two-dimensional-scroll",
    );
    requireTruth(widthEquivalentLayout.clippedCoreContentCount === 0, "width-equivalent-clipping");
    requireTruth(widthEquivalentLayout.coreContentCount >= 1, "width-equivalent-core-content");
    await figmaFoundationProbe(page, S232G_WIDTH_EQUIVALENT_VIEWPORT.width);
    if (route.parityKind === "direct-product-frame") {
      await studyLedgerFigmaProbe(page, S232G_WIDTH_EQUIVALENT_VIEWPORT.width);
    }
    axeScanCount += await scanAxe(page);
  }

  const afterSha = await observedDeploymentSha(page);
  requireTruth(
    afterSha.status === 200 && afterSha.ready && afterSha.deploymentSha === runtimeTargetSha,
    "post-runtime-sha",
  );
  requireTruth(runtimeRunnerSha === runtimeTargetSha, "runner-target-sha-equality");

  const allCounters = [mainCounters, secondaryCounters, freshCounters];
  const consoleErrorCount = sumCounters(allCounters, "consoleErrorCount");
  const pageErrorCount = sumCounters(allCounters, "pageErrorCount");
  const requestFailureCount = sumCounters(allCounters, "requestFailureCount");
  const httpErrorCount = sumCounters(allCounters, "httpErrorCount");
  const expectedCrossAccountHttpErrorCount = sumCounters(
    allCounters,
    "expectedCrossAccountHttpErrorCount",
  );
  const causallyBoundNavigationAbortCount = sumCounters(
    allCounters,
    "causallyBoundNavigationAbortCount",
  );
  const itemMutationRequestCount = sumCounters(allCounters, "itemMutationRequestCount");
  const calculatorRoutineCompletionRequestCount = sumCounters(
    allCounters,
    "calculatorRoutineCompletionRequestCount",
  );
  const blockedPreviewToolbarMutationCount = sumCounters(
    allCounters,
    "blockedPreviewToolbarMutationCount",
  );
  const excludedPreviewToolbarConsoleErrorCount = sumCounters(
    allCounters,
    "excludedPreviewToolbarConsoleErrorCount",
  );
  requireTruth(consoleErrorCount === 0, "unexpected-console-errors");
  requireTruth(pageErrorCount === 0, "unexpected-page-errors");
  requireTruth(requestFailureCount === 0, "unexpected-request-failures");
  requireTruth(httpErrorCount === 0, "unexpected-http-errors");
  requireTruth(expectedCrossAccountHttpErrorCount === 1, "exact-cross-account-http-denial-count");
  requireTruth(
    allCounters.every((counter) => counter.causallyBoundNavigationAbortCount <= 1) &&
      causallyBoundNavigationAbortCount <= allCounters.length,
    "auth-navigation-abort-causal-bound",
  );
  requireTruth(itemMutationRequestCount === 2, "bounded-source-and-rewrite-mutations");
  requireTruth(
    calculatorRoutineCompletionRequestCount === 0,
    "calculator-component-probe-no-server-mutation",
  );
  requireTruth(
    source.created &&
      source.mutationAttempted &&
      source.savingTransitionObserved &&
      source.completedTransitionObserved,
    "capture-source-observed-state-transition",
  );
  requireTruth(blockedPreviewToolbarMutationCount <= 64, "toolbar-mutation-bound");
  requireTruth(
    excludedPreviewToolbarConsoleErrorCount <= blockedPreviewToolbarMutationCount,
    "toolbar-console-causal-bound",
  );
  requireTruth(axeScanCount === S232G_ROUTES.length * 4, "axe-scan-completeness");
  requireTruth(visibleHeadingCount === S232G_ROUTES.length, "heading-completeness");
  requireTruth(keyboardRouteCount === S232G_ROUTES.length, "keyboard-completeness");
  requireTruth(
    directFigmaProductFrameRouteCount === 1 &&
      directFigmaComponentOnlyRouteCount === 1,
    "direct-figma-route-completeness",
  );

  const evidenceRows = buildS232GExpectedEvidenceDescriptors().map((descriptor) => ({
    commitSha: runtimeRunnerSha,
    deploymentSha: afterSha.deploymentSha,
    viewport: descriptor.viewport,
    route: descriptor.route,
    scenario: descriptor.scenario,
    result: "pass",
    remainingLimitation: descriptor.remainingLimitation,
  }));
  const summary = {
    schemaVersion: 1,
    result: "pass",
    commitSha: runtimeRunnerSha,
    deploymentSha: afterSha.deploymentSha,
    rowCount: evidenceRows.length,
    canonicalRouteCount: S232G_ROUTES.length,
    aliasCount: S232G_ALIASES.length,
    excludedRouteCount: S232G_EXCLUSIONS.length,
    viewportCount: S232G_VIEWPORTS.length,
    axeScanCount,
    axeBlockingCount: 0,
    visibleHeadingCount,
    keyboardRouteCount,
    keyboardFailureCount: 0,
    horizontalOverflowCount: 0,
    nestedTwoDimensionalScrollCount: 0,
    clippedCoreContentCount: 0,
    consoleErrorCount,
    pageErrorCount,
    requestFailureCount,
    httpErrorCount,
    blockedPreviewToolbarMutationCount,
    excludedPreviewToolbarConsoleErrorCount,
    sourceCreatedCount: 1,
    durableSaveReceiptCount: 1,
    reloadComparisonCount: 1,
    notesRoundTripCount: 1,
    freshAccountContextCount: 1,
    crossAccountApiDenialCount: 2,
    crossAccountUiDenialCount: 1,
    crossAccountCollectionAbsenceCount: 3,
    ownerPositiveControlCount: 2,
    stateAnnouncementProxyCount: 1,
    directFigmaProductFrameRouteCount,
    directFigmaComponentOnlyRouteCount,
    semanticComponentOnlyRouteCount: S232G_ROUTES.length - 2,
    actualBrowserZoomClaimed: false,
    realScreenReaderClaimed: false,
    credentialsCaptured: false,
    rawLearnerContentCaptured: false,
    requestBodyCaptured: false,
    responseBodyCaptured: false,
    itemIdCaptured: false,
    userIdCaptured: false,
    emailCaptured: false,
    urlCaptured: false,
    domCaptured: false,
    screenshotCaptured: false,
    traceCaptured: false,
    videoCaptured: false,
  };
  await Promise.all([
    writeFile(
      testInfo.outputPath("s232g-matrix.ndjson"),
      evidenceRows.map((row) => JSON.stringify(row)).join("\n") + "\n",
      "utf8",
    ),
    writeFile(
      testInfo.outputPath("s232g-summary.json"),
      JSON.stringify(summary, null, 2) + "\n",
      "utf8",
    ),
  ]);
});
