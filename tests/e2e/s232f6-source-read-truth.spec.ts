import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Browser,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { randomUUID } from "node:crypto";
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
  sanitizeRuntimeEvidence,
} from "./support/authenticated-runtime";

const runtimeEnabled = process.env.S232F6_AUTH_RUNTIME === "1";
const sourcePathPrefix = "/api/os/items/";
const syntheticSourceId = "s232f6-synthetic-source";
const syntheticForeignSourceId = "s232f6-synthetic-foreign";
const syntheticForeignUserId = "018f2f4a-7b2c-4d11-8a3f-1234567890ab";
const accountAEmail = process.env.E2E_USER_A_EMAIL?.trim() ?? "";
const accountAPassword = process.env.E2E_USER_A_PASSWORD ?? "";
const accountBEmail = process.env.E2E_USER_B_EMAIL?.trim() ?? "";
const accountBPassword = process.env.E2E_USER_B_PASSWORD ?? "";
const viewports = [
  { label: "390", width: 390, height: 844 },
  { label: "768", width: 768, height: 1024 },
  { label: "1440", width: 1440, height: 1024 },
] as const;

test.use({
  extraHTTPHeaders: protectionHeaders,
  serviceWorkers: "block",
  screenshot: "off",
  trace: "off",
  video: "off",
});
test.skip(!runtimeEnabled, "Set S232F6_AUTH_RUNTIME=1 for exact-head source-read acceptance.");
test.describe.configure({ timeout: 300_000, retries: 0 });

async function observedDeploymentSha(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/runtime/version", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const body = (await response.json()) as {
      ready?: boolean;
      deploymentSha?: string;
    };
    return {
      status: response.status,
      ready: body.ready,
      deploymentSha: body.deploymentSha,
    };
  });
}

async function authenticatedUserId(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/auth/session", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const body = (await response.json()) as {
      ok?: boolean;
      session?: { isAuthenticated?: boolean; userId?: string | null };
    };
    if (
      response.status !== 200 ||
      body.ok !== true ||
      body.session?.isAuthenticated !== true ||
      typeof body.session.userId !== "string"
    ) {
      throw new Error("S232F.6 could not verify the authenticated runtime identity.");
    }
    return body.session.userId;
  });
}

function requireTwoAccountCredentials() {
  const missing = [
    ["E2E_USER_A_EMAIL", accountAEmail],
    ["E2E_USER_A_PASSWORD", accountAPassword],
    ["E2E_USER_B_EMAIL", accountBEmail],
    ["E2E_USER_B_PASSWORD", accountBPassword],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(
      `S232F.6 real cross-account denial missing required env: ${missing.join(", ")}`,
    );
  }
}

async function loginWithCredentials(page: Page, email: string, password: string) {
  await page.goto("/login?mode=first", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  const emailInput = page.getByLabel("이메일");
  const passwordInput = page.getByLabel("비밀번호");
  const submit = page.getByTestId("login-submit");
  await expect(emailInput).toBeVisible({ timeout: 20_000 });
  await expect(passwordInput).toBeVisible({ timeout: 20_000 });
  await expect(submit).toBeEnabled({ timeout: 20_000 });
  await emailInput.fill(email);
  await passwordInput.fill(password);
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === "POST" && url.pathname === "/api/auth/sign-in";
  });
  await submit.click();
  const response = await responsePromise;
  if (response.status() !== 200) {
    throw new Error(
      `S232F.6 dedicated cross-account sign-in returned HTTP ${response.status()}.`,
    );
  }
  await expect(page).toHaveURL((url) => url.pathname === "/app", {
    timeout: 20_000,
  });
  return authenticatedUserId(page);
}

async function firstExistingWrongAnswerItemId(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/os/items?limit=100", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const body = (await response.json()) as {
      ok?: boolean;
      items?: Array<{ id?: unknown }>;
    };
    if (response.status !== 200 || body.ok !== true || !Array.isArray(body.items)) {
      throw new Error("S232F.6 account A item-list fixture read failed.");
    }
    const itemId = body.items.find((item) => typeof item.id === "string")?.id;
    if (typeof itemId !== "string") {
      throw new Error("S232F.6 account A has no existing read-only item fixture.");
    }
    return itemId;
  });
}

async function ownedDetailProof(page: Page, itemId: string, expectedUserId: string) {
  return page.evaluate(
    async ({ requestedItemId, ownerUserId }) => {
      const response = await fetch(
        `/api/os/items/${encodeURIComponent(requestedItemId)}`,
        { cache: "no-store", credentials: "same-origin" },
      );
      const body = (await response.json().catch(() => null)) as
        | {
            ok?: unknown;
            detail?: { item?: { id?: unknown; userId?: unknown } } | null;
          }
        | null;
      return {
        status: response.status,
        exactKeys:
          body !== null &&
          Object.keys(body).sort().join(",") === "detail,ok",
        ok: body?.ok === true,
        detailIsPresent:
          typeof body?.detail === "object" && body.detail !== null,
        itemMatches:
          body?.detail?.item?.id === requestedItemId &&
          body?.detail?.item?.userId === ownerUserId,
      };
    },
    { requestedItemId: itemId, ownerUserId: expectedUserId },
  );
}

async function verifyRealCrossAccountDenial(browser: Browser) {
  requireTwoAccountCredentials();
  const contextOptions = {
    baseURL: runtimeBaseUrl,
    extraHTTPHeaders: protectionHeaders,
    serviceWorkers: "block" as const,
  };
  const accountAContext = await browser.newContext(contextOptions);
  const accountBContext = await browser.newContext(contextOptions);
  try {
    const accountAPage = await accountAContext.newPage();
    await establishProtectedPreviewSession(accountAPage, "S232F.6 account A");
    const accountAUserId = await loginWithCredentials(
      accountAPage,
      accountAEmail,
      accountAPassword,
    );
    const accountARuntimeErrors = monitorRuntimeErrors(accountAPage);
    const accountAItemId = await firstExistingWrongAnswerItemId(accountAPage);
    expect(
      await ownedDetailProof(accountAPage, accountAItemId, accountAUserId),
    ).toEqual({
      status: 200,
      exactKeys: true,
      ok: true,
      detailIsPresent: true,
      itemMatches: true,
    });

    const accountBPage = await accountBContext.newPage();
    await establishProtectedPreviewSession(accountBPage, "S232F.6 account B");
    const accountBUserId = await loginWithCredentials(
      accountBPage,
      accountBEmail,
      accountBPassword,
    );
    const accountBRuntimeErrors = monitorRuntimeErrors(accountBPage);
    if (accountAUserId === accountBUserId) {
      throw new Error("S232F.6 cross-account credentials resolved to the same identity.");
    }

    const denial = await accountBPage.evaluate(async (itemId) => {
      const response = await fetch(`/api/os/items/${encodeURIComponent(itemId)}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const body = (await response.json().catch(() => null)) as
        | { ok?: unknown; detail?: unknown }
        | null;
      return {
        status: response.status,
        exactKeys:
          body !== null &&
          Object.keys(body).sort().join(",") === "detail,ok",
        ok: body?.ok === true,
        detailIsNull: body?.detail === null,
      };
    }, accountAItemId);
    expect(denial).toEqual({
      status: 200,
      exactKeys: true,
      ok: true,
      detailIsNull: true,
    });

    await accountBPage.goto(
      `/app/first/ox?sourceItemId=${encodeURIComponent(accountAItemId)}`,
      { waitUntil: "domcontentloaded", timeout: 30_000 },
    );
    await expect(
      accountBPage.locator(
        '[data-s232f6-source-read-state="missing"][data-s232f6-source-read-surface="first_ox"]',
      ),
    ).toHaveCount(1);
    await expect(accountBPage.getByRole("button", { name: "O + 확실함" })).toHaveCount(0);

    await accountBPage.goto(
      `/app/session?mode=first&savedCapture=1&itemId=${encodeURIComponent(accountAItemId)}`,
      { waitUntil: "domcontentloaded", timeout: 30_000 },
    );
    await expect(
      accountBPage.locator(
        '[data-s232f6-source-read-state="missing"][data-s232f6-source-read-surface="session"]',
      ),
    ).toHaveCount(1);
    await expect(
      accountBPage.getByText("오늘 계획에 반영했습니다.", { exact: true }),
    ).toHaveCount(0);
    expect(
      await ownedDetailProof(accountAPage, accountAItemId, accountAUserId),
    ).toEqual({
      status: 200,
      exactKeys: true,
      ok: true,
      detailIsPresent: true,
      itemMatches: true,
    });

    const accountRuntimeErrors = [accountARuntimeErrors, accountBRuntimeErrors];
    const unexpectedRuntimeErrorCount = accountRuntimeErrors.reduce(
      (count, errors) =>
        count +
        errors.consoleErrors.length +
        errors.pageErrors.length +
        errors.sameOriginRequestFailures.length,
      0,
    );
    for (const errors of accountRuntimeErrors) {
      expect(errors.consoleErrors).toEqual([]);
      expect(errors.pageErrors).toEqual([]);
      expect(errors.sameOriginRequestFailures).toEqual([]);
    }
    return {
      apiDenialCount: 1,
      uiDenialCount: 2,
      ownerReadablePositiveControlCount: 2,
      unexpectedRuntimeErrorCount,
    } as const;
  } finally {
    await accountAContext.close();
    await accountBContext.close();
  }
}

async function installContextWideMutationProbe(page: Page) {
  let active = false;
  let storageMutationCount = 0;
  let analyticsMutationCount = 0;
  let instrumentationErrorCount = 0;
  const runtimeOrigin = new URL(runtimeBaseUrl).origin;
  await page.context().exposeBinding(
    "__s232f6RecordMutation",
    (_source, kind: unknown) => {
      let sourceOrigin = "";
      try {
        sourceOrigin = new URL(_source.frame.url()).origin;
      } catch {
        instrumentationErrorCount += 1;
        return;
      }
      if (sourceOrigin !== runtimeOrigin) {
        instrumentationErrorCount += 1;
        return;
      }
      if (kind === "barrier") return;
      if (kind !== "storage" && kind !== "analytics") {
        instrumentationErrorCount += 1;
        return;
      }
      if (!active) return;
      if (kind === "storage") storageMutationCount += 1;
      if (kind === "analytics") analyticsMutationCount += 1;
    },
  );
  await page.context().addInitScript(() => {
    const runtimeWindow = window as Window & {
      __s232f6RecordMutation?: (
        kind: "storage" | "analytics" | "barrier",
      ) => Promise<void>;
      __s232f6FlushMutationProbe?: () => Promise<number>;
      dataLayer?: unknown;
      invergeDataLayer?: unknown;
    };
    const pending = new Set<Promise<void>>();
    let localInstrumentationErrorCount = 0;
    const reportProbeError = () => {
      localInstrumentationErrorCount += 1;
      console.error("S232F.6 mutation instrumentation failed closed.");
    };
    const record = (kind: "storage" | "analytics") => {
      const binding = runtimeWindow.__s232f6RecordMutation;
      if (typeof binding !== "function") {
        reportProbeError();
        return;
      }
      const request = binding(kind).catch(() => {
        reportProbeError();
      });
      pending.add(request);
      void request.finally(() => pending.delete(request));
    };

    const originalSetItem = Storage.prototype.setItem;
    Object.defineProperty(Storage.prototype, "setItem", {
      configurable: true,
      value: function (key: string, value: string) {
        const before = this.getItem(key);
        const result = Reflect.apply(originalSetItem, this, [key, value]);
        if (this.getItem(key) !== before) record("storage");
        return result;
      },
      writable: true,
    });
    const originalRemoveItem = Storage.prototype.removeItem;
    Object.defineProperty(Storage.prototype, "removeItem", {
      configurable: true,
      value: function (key: string) {
        const existed = this.getItem(key) !== null;
        const result = Reflect.apply(originalRemoveItem, this, [key]);
        if (existed && this.getItem(key) === null) record("storage");
        return result;
      },
      writable: true,
    });
    const originalClear = Storage.prototype.clear;
    Object.defineProperty(Storage.prototype, "clear", {
      configurable: true,
      value: function () {
        const hadEntries = this.length > 0;
        const result = Reflect.apply(originalClear, this, []);
        if (hadEntries && this.length === 0) {
          record("storage");
        }
        return result;
      },
      writable: true,
    });

    const originalPush = Array.prototype.push;
    Object.defineProperty(Array.prototype, "push", {
      configurable: true,
      value: function (...values: unknown[]) {
        if (
          this === runtimeWindow.dataLayer ||
          this === runtimeWindow.invergeDataLayer
        ) {
          for (let index = 0; index < values.length; index += 1) {
            record("analytics");
          }
        }
        return Reflect.apply(originalPush, this, values);
      },
      writable: true,
    });
    runtimeWindow.__s232f6FlushMutationProbe = async () => {
      await Promise.all([...pending]);
      const binding = runtimeWindow.__s232f6RecordMutation;
      if (typeof binding !== "function") {
        reportProbeError();
        throw new Error("S232F.6 mutation instrumentation binding is unavailable.");
      }
      try {
        await binding("barrier");
      } catch {
        reportProbeError();
        throw new Error("S232F.6 mutation instrumentation barrier failed.");
      }
      return localInstrumentationErrorCount;
    };
  });
  return {
    barrier: async () => {
      return page.evaluate(async () => {
        const runtimeWindow = window as Window & {
          __s232f6FlushMutationProbe?: () => Promise<number>;
        };
        if (!runtimeWindow.__s232f6FlushMutationProbe) {
          throw new Error("S232F.6 mutation instrumentation is unavailable.");
        }
        return runtimeWindow.__s232f6FlushMutationProbe();
      });
    },
    activate: () => {
      active = true;
    },
    snapshot: () => ({
      storageMutationCount,
      analyticsMutationCount,
      instrumentationErrorCount,
    }),
  };
}

async function browserStorageDigest(page: Page) {
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
    const value = `${serialize(localStorage)}\u0000${serialize(sessionStorage)}`;
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value),
    );
    return Array.from(new Uint8Array(digest), (entry) =>
      entry.toString(16).padStart(2, "0"),
    ).join("");
  });
}

async function first100WrongAnswerIdDigest(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/os/items?limit=100", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const body = (await response.json()) as {
      ok?: boolean;
      items?: Array<{ id?: unknown }>;
    };
    if (response.status !== 200 || body.ok !== true || !Array.isArray(body.items)) {
      throw new Error("S232F.6 could not read the metadata-only item set.");
    }
    const ids = body.items
      .map((item) => item.id)
      .filter((value): value is string => typeof value === "string")
      .sort();
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify(ids)),
    );
    return Array.from(new Uint8Array(digest), (entry) =>
      entry.toString(16).padStart(2, "0"),
    ).join("");
  });
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${label} must not overflow horizontally.`).toBeLessThanOrEqual(1);
}

async function axeBlockingCount(page: Page, label: string) {
  const result = await new AxeBuilder({ page })
    .include("main#learner-main")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = result.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(blocking, `${label} Axe serious/critical violations`).toEqual([]);
  return blocking.length;
}

async function focusStyle(target: Locator) {
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

async function tabUntilFocused(page: Page, target: Locator) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  const before = await focusStyle(target);
  let reached = false;
  for (let index = 0; index < 40; index += 1) {
    await page.keyboard.press("Tab");
    reached = await target.evaluate((element) => element === document.activeElement);
    if (reached) break;
  }
  expect(reached, "Tab must reach the source-read retry action.").toBe(true);
  const after = await focusStyle(target);
  expect(after.focusVisible).toBe(true);
  expect(
    before.outline !== after.outline ||
      before.boxShadow !== after.boxShadow ||
      before.borderColor !== after.borderColor ||
      before.backgroundColor !== after.backgroundColor,
    "The retry action must expose a computed focus-style delta.",
  ).toBe(true);
}

function syntheticCaptureDetail(userId: string, itemId: string, rawText: string) {
  return {
    item: {
      id: itemId,
      userId,
      examName: "감정평가사 1차",
      subjectLabel: "민법",
      createdFromCapture: true,
      rawPayload: {
        user_confirmed_fields: { rawQuestionText: rawText },
      },
      rawQuestionText: rawText,
      problemTitle: "브라우저 전용 합성 O/X 원본",
      keyConcepts: ["합성 확인"],
    },
  };
}

test("S232F.6 exact-head Session and First OX keep requested reads truthful", async ({
  browser,
  page,
}, testInfo: TestInfo) => {
  requireSafeAuthenticatedRuntime("S232F.6", {
    requireTargetSha: true,
    requireExactHead: true,
  });
  const realCrossAccountDenial = await verifyRealCrossAccountDenial(browser);

  await page.setViewportSize({ width: 390, height: 844 });
  const mutationProbe = await installContextWideMutationProbe(page);
  await establishProtectedPreviewSession(page, "S232F.6");
  const { signInAttempts } = await loginWithDedicatedTestAccount(page, "first");
  const expectedUserId = await authenticatedUserId(page);
  const runtimeErrors = monitorRuntimeErrors(page);
  const runtimeOrigin = new URL(runtimeBaseUrl).origin;
  const exactSyntheticPath = `${sourcePathPrefix}${syntheticSourceId}`;
  const locatedConsoleErrors: Array<{
    text: string;
    sameOrigin: boolean;
    pathname: string;
    emptySearchAndHash: boolean;
  }> = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const rawLocation = message.location().url;
    let sameOrigin = false;
    let pathname = "";
    let emptySearchAndHash = false;
    if (rawLocation) {
      try {
        const location = new URL(rawLocation);
        sameOrigin = location.origin === runtimeOrigin;
        pathname = sameOrigin ? location.pathname : "cross-origin";
        emptySearchAndHash = location.search === "" && location.hash === "";
      } catch {
        pathname = "invalid";
      }
    }
    locatedConsoleErrors.push({
      text: sanitizeRuntimeEvidence(message.text()),
      sameOrigin,
      pathname,
      emptySearchAndHash,
    });
  });
  const postLoginBrowserInstrumentationErrorCount = await mutationProbe.barrier();
  expect(postLoginBrowserInstrumentationErrorCount).toBe(0);
  mutationProbe.activate();
  const storageBefore = await browserStorageDigest(page);
  const itemDigestBefore = await first100WrongAnswerIdDigest(page);
  const observedBefore = await observedDeploymentSha(page);
  expect(observedBefore).toEqual({
    status: 200,
    ready: true,
    deploymentSha: runtimeTargetSha,
  });

  const readOnlyMethods = new Set(["GET", "HEAD", "OPTIONS"]);
  const missingItemId = randomUUID();
  const syntheticChoices =
    "① 합성 선지 하나\n② 합성 선지 둘\n③ 합성 선지 셋\n④ 합성 선지 넷\n⑤ 합성 선지 다섯";
  const foreignSentinel = "브라우저 전용 외부 계정 합성 원본";
  let syntheticSourceAttempts = 0;
  let sourceReadRequestCount = 0;
  let postLoginBrowserMutationRequestCount = 0;

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.origin === runtimeOrigin &&
      url.pathname.startsWith(sourcePathPrefix) &&
      request.method() === "GET"
    ) {
      sourceReadRequestCount += 1;
    }
  });

  await page.context().route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const exactForeignPath = `${sourcePathPrefix}${syntheticForeignSourceId}`;

    if (
      url.origin === runtimeOrigin &&
      url.pathname === exactSyntheticPath &&
      url.search === "" &&
      request.method() === "GET"
    ) {
      syntheticSourceAttempts += 1;
      if (syntheticSourceAttempts === 1) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ ok: false }),
        });
        return;
      }
      if (syntheticSourceAttempts === 2) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            detail: syntheticCaptureDetail(
              expectedUserId,
              syntheticSourceId,
              syntheticChoices,
            ),
          }),
        });
        return;
      }
      await route.abort("blockedbyclient");
      throw new Error("S232F.6 observed an unexpected extra synthetic source read.");
    }

    if (
      url.origin === runtimeOrigin &&
      url.pathname === exactForeignPath &&
      url.search === "" &&
      request.method() === "GET"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          detail: syntheticCaptureDetail(
            syntheticForeignUserId,
            syntheticForeignSourceId,
            foreignSentinel,
          ),
        }),
      });
      return;
    }

    if (!readOnlyMethods.has(request.method())) {
      postLoginBrowserMutationRequestCount += 1;
      await route.abort("blockedbyclient");
      throw new Error("S232F.6 blocked an unexpected non-read browser request.");
    }
    await route.continue();
  });

  await page.goto(`/app/first/ox?sourceItemId=${syntheticSourceId}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  const unavailable = page.locator(
    '[data-s232f6-source-read-state="unavailable"][data-s232f6-source-read-surface="first_ox"]',
  );
  await expect(unavailable).toHaveCount(1);
  await expect(page.getByRole("button", { name: "O + 확실함" })).toHaveCount(0);
  await expect(page.getByText("O/X 역공학 연습", { exact: true })).toHaveCount(0);

  let axeBlocking = await axeBlockingCount(page, "First OX unavailable");
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expectNoHorizontalOverflow(page, `First OX unavailable ${viewport.label}`);
  }
  await page.setViewportSize({ width: 720, height: 1024 });
  await expectNoHorizontalOverflow(page, "First OX unavailable 200%-width equivalent");
  await page.setViewportSize({ width: 390, height: 844 });

  const retry = page.getByRole("button", { name: "원본 기록 다시 확인" });
  await expect(retry).toBeVisible();
  expect(await retry.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await tabUntilFocused(page, retry);
  const failureRegion = page.getByTestId("s232f6-first_ox-source-unavailable");
  await expect(failureRegion).toHaveAttribute("role", "region");
  await expect(failureRegion).toHaveAttribute("aria-labelledby", /.+/);
  await expect(failureRegion).toHaveAttribute("aria-describedby", /.+/);
  const liveStatus = failureRegion.locator('[role="status"][aria-live="polite"][aria-atomic="true"]');
  await expect(liveStatus).toHaveCount(1);
  await page.keyboard.press("Enter");

  await expect(page.getByText("확인하고 O/X 연습 시작", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "O + 확실함" })).toHaveCount(0);
  expect(syntheticSourceAttempts).toBe(2);

  const missingResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.origin === runtimeOrigin &&
      url.pathname === `${sourcePathPrefix}${missingItemId}` &&
      response.request().method() === "GET"
    );
  });
  await page.goto(`/app/first/ox?sourceItemId=${missingItemId}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  const missingResponse = await missingResponsePromise;
  expect(missingResponse.status()).toBe(200);
  const missingBody = (await missingResponse.json()) as {
    ok?: boolean;
    detail?: unknown;
  };
  expect(missingBody).toEqual({ ok: true, detail: null });
  const firstOxMissing = page.locator(
    '[data-s232f6-source-read-state="missing"][data-s232f6-source-read-surface="first_ox"]',
  );
  await expect(firstOxMissing).toHaveCount(1);
  await expect(page.getByRole("button", { name: "O + 확실함" })).toHaveCount(0);
  axeBlocking += await axeBlockingCount(page, "First OX missing");

  await page.goto(`/app/first/ox?sourceItemId=${syntheticForeignSourceId}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await expect(firstOxMissing).toHaveCount(1);
  await expect(page.getByText(foreignSentinel, { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "O + 확실함" })).toHaveCount(0);

  await page.goto(
    `/app/session?mode=first&savedCapture=1&itemId=${missingItemId}`,
    { waitUntil: "domcontentloaded", timeout: 30_000 },
  );
  const sessionMissing = page.locator(
    '[data-s232f6-source-read-state="missing"][data-s232f6-source-read-surface="session"]',
  );
  await expect(sessionMissing).toHaveCount(1);
  await expect(page.getByText("오늘 계획에 반영했습니다.", { exact: true })).toHaveCount(0);
  axeBlocking += await axeBlockingCount(page, "Session missing");
  await expectNoHorizontalOverflow(page, "Session missing 390");

  const storageAfter = await browserStorageDigest(page);
  const itemDigestAfter = await first100WrongAnswerIdDigest(page);
  const observedAfter = await observedDeploymentSha(page);
  const finalBrowserInstrumentationErrorCount = await mutationProbe.barrier();
  const mutationCounts = mutationProbe.snapshot();
  expect(observedAfter).toEqual(observedBefore);
  expect(storageAfter).toBe(storageBefore);
  expect(itemDigestAfter).toBe(itemDigestBefore);
  expect(mutationCounts.storageMutationCount).toBe(0);
  expect(mutationCounts.analyticsMutationCount).toBe(0);
  expect(mutationCounts.instrumentationErrorCount).toBe(0);
  expect(finalBrowserInstrumentationErrorCount).toBe(0);
  expect(postLoginBrowserMutationRequestCount).toBe(0);
  expect(sourceReadRequestCount).toBe(4);
  expect(axeBlocking).toBe(0);

  const controlledFailure = `GET ${sourcePathPrefix}${syntheticSourceId} HTTP 503`;
  const unexpectedRequestFailures = runtimeErrors.sameOriginRequestFailures.filter(
    (entry) => entry !== controlledFailure,
  );
  const controlledRequestFailureCount =
    runtimeErrors.sameOriginRequestFailures.length - unexpectedRequestFailures.length;
  const controlledConsolePattern =
    /^Failed to load resource: the server responded with a status of 503(?: \(Service Unavailable\))?$/;
  expect(locatedConsoleErrors.map(({ text }) => text)).toEqual(
    runtimeErrors.consoleErrors,
  );
  const unexpectedConsoleErrors = locatedConsoleErrors.filter(
    (entry) =>
      !(
        entry.sameOrigin &&
        entry.pathname === exactSyntheticPath &&
        entry.emptySearchAndHash &&
        controlledConsolePattern.test(entry.text)
      ),
  );
  const controlledConsoleErrorCount =
    locatedConsoleErrors.length - unexpectedConsoleErrors.length;
  expect(controlledRequestFailureCount).toBe(1);
  expect(controlledConsoleErrorCount).toBe(controlledRequestFailureCount);
  expect(unexpectedRequestFailures).toEqual([]);
  expect(unexpectedConsoleErrors).toEqual([]);
  expect(runtimeErrors.pageErrors).toEqual([]);

  const evidence = {
    schemaVersion: 1,
    result: "pass",
    runnerSha: runtimeRunnerSha,
    targetDeploymentSha: runtimeTargetSha,
    observedDeploymentSha: observedAfter.deploymentSha,
    signInAttempts,
    surfaceCount: 2,
    viewportCount: 3,
    desktopZoomWidthEquivalentPercent: 200,
    unavailableStateCount: 1,
    retryRecoveryCount: 1,
    genuineMissingStateCount: 2,
    sessionFalseSuccessExposureCount: 0,
    requestedSampleFallbackExposureCount: 0,
    syntheticCrossAccountUiDenialCount: 1,
    realCrossAccountApiDenialCount: realCrossAccountDenial.apiDenialCount,
    realCrossAccountUiDenialCount: realCrossAccountDenial.uiDenialCount,
    realCrossAccountOwnerReadablePositiveControlCount:
      realCrossAccountDenial.ownerReadablePositiveControlCount,
    realCrossAccountUnexpectedRuntimeErrorCount:
      realCrossAccountDenial.unexpectedRuntimeErrorCount,
    realTwoAccountDenialClaimed: true,
    responsiveOverflowVerified: true,
    widthEquivalentReflowVerified: true,
    keyboardRetryReachabilityCount: 1,
    focusVisibleVerified: true,
    ariaRegionContractVerified: true,
    ariaLiveContractVerified: true,
    axeBlockingCount: axeBlocking,
    sourceReadRequestCount,
    controlledSourceFailureCount: controlledRequestFailureCount,
    controlledConsoleErrorCount,
    unexpectedConsoleErrorCount: unexpectedConsoleErrors.length,
    pageErrorCount: runtimeErrors.pageErrors.length,
    unexpectedRequestFailureCount: unexpectedRequestFailures.length,
    postLoginBrowserMutationRequestCount,
    first100WrongAnswerIdsFinalDigestUnchanged:
      itemDigestAfter === itemDigestBefore,
    browserStorageFinalDigestUnchanged: storageAfter === storageBefore,
    browserStorageMutationCount: mutationCounts.storageMutationCount,
    analyticsMutationCount: mutationCounts.analyticsMutationCount,
    instrumentationErrorCount: mutationCounts.instrumentationErrorCount,
    browserInstrumentationErrorCount: finalBrowserInstrumentationErrorCount,
    globalDatabaseImmutabilityClaimed: false,
    knownServerReadSideEffectsExcluded: true,
    credentialsCaptured: false,
    rawLearnerContentCaptured: false,
    syntheticPayloadCaptured: false,
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
  const outputPath = testInfo.outputPath("s232f6-runtime.json");
  await writeFile(outputPath, JSON.stringify(evidence));
  await testInfo.attach("s232f6-runtime", {
    path: outputPath,
    contentType: "application/json",
  });
});
