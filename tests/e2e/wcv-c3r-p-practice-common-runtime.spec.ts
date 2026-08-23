import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const baseURL = process.env.E2E_BASE_URL ?? "";
const emailA = process.env.C3R_P_USER_A_EMAIL ?? "";
const passwordA = process.env.C3R_P_USER_A_PASSWORD ?? "";
const emailB = process.env.C3R_P_USER_B_EMAIL ?? "";
const passwordB = process.env.C3R_P_USER_B_PASSWORD ?? "";
const emailC = process.env.C3R_P_USER_C_EMAIL ?? "";
const passwordC = process.env.C3R_P_USER_C_PASSWORD ?? "";
const evidencePath = process.env.C3R_P_BROWSER_EVIDENCE_PATH ?? "";
const entryEvidencePath = process.env.C3R_P_ENTRY_EVIDENCE_PATH ?? "";
const playwrightContextPath = process.env.C3R_P_PLAYWRIGHT_CONTEXT_PATH ?? "";
const restoreOnly = process.env.C3R_P_RESTORE_ONLY === "true";
const entryOnly = process.env.C3R_P_ENTRY_ONLY === "true";
const entryActor = process.env.C3R_P_ENTRY_ACTOR ?? "owner";
const expectedEntryClassification =
  process.env.C3R_P_ENTRY_EXPECTATION ?? "C3R_P_ENTRY_VERIFIED";
const C3R_P_SOURCE_REVISION_ID = "26a4f3bd-ddf3-4215-9fdf-d83453122ce1";
const MISMATCHED_SOURCE_REVISION_ID = "d2889575-35e6-4e31-9ed7-e27ae55d7e8d";

const ENTRY_CLASSIFICATIONS = [
  "C3R_P_ENTRY_AUTH_SESSION_NOT_VISIBLE",
  "C3R_P_ENTRY_GENERIC_APP_ACCESS_DENIED",
  "C3R_P_ENTRY_C3R_ACCESS_GATE_DENIED",
  "C3R_P_ENTRY_NOT_FOUND",
  "C3R_P_ENTRY_CLIENT_API_TIMEOUT",
  "C3R_P_ENTRY_NEXT_RENDER_ERROR",
  "C3R_P_ENTRY_VERIFIED",
] as const;

type EntryClassification = (typeof ENTRY_CLASSIFICATIONS)[number];

function requireLocalRuntime() {
  if (
    !baseURL ||
    !emailA ||
    !passwordA ||
    !emailB ||
    !passwordB ||
    !emailC ||
    !passwordC ||
    !evidencePath ||
    !entryEvidencePath ||
    !playwrightContextPath
  ) {
    throw new Error("C3R-P browser runtime environment is incomplete");
  }
  if (
    !ENTRY_CLASSIFICATIONS.includes(
      expectedEntryClassification as EntryClassification,
    )
  ) {
    throw new Error("C3R-P entry expectation is invalid");
  }
  if (!["owner", "non_owner", "unauthenticated"].includes(entryActor)) {
    throw new Error("C3R-P entry actor is invalid");
  }
  if (!["127.0.0.1", "localhost", "::1"].includes(new URL(baseURL).hostname)) {
    throw new Error("C3R-P browser runtime refused a non-local target");
  }
}

async function login(context: BrowserContext, email: string, password: string) {
  try {
    const response = await context.request.post("/api/auth/sign-in", {
      data: { email, password, mode: "second" },
      timeout: 20_000,
    });
    return response.status();
  } catch {
    return null;
  }
}

async function contextFor(browser: Browser, email: string, password: string) {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
  });
  const loginStatus = await login(context, email, password);
  expect(loginStatus).toBe(200);
  return context;
}

function browserErrorCategory(message: string) {
  if (/hydration/i.test(message)) return "HYDRATION";
  if (/chunk|module/i.test(message)) return "MODULE_LOAD";
  if (/network|failed to load resource/i.test(message)) {
    return "NETWORK_RESOURCE";
  }
  if (/content security policy/i.test(message)) {
    return "CONTENT_SECURITY_POLICY";
  }
  return "CONSOLE_ERROR";
}

function pageErrorCategory(error: Error) {
  if (error.name === "TypeError") return "TYPE_ERROR";
  if (error.name === "ReferenceError") return "REFERENCE_ERROR";
  if (error.name === "SyntaxError") return "SYNTAX_ERROR";
  return "PAGE_ERROR";
}

function requestFailureCategory(errorText: string | null) {
  if (!errorText) return "REQUEST_FAILED";
  if (/timed?out/i.test(errorText)) return "TIMEOUT";
  if (/aborted|cancelled/i.test(errorText)) return "ABORTED";
  if (/refused|reset|closed/i.test(errorText)) return "CONNECTION";
  return "REQUEST_FAILED";
}

function boundedErrorCode(value: unknown) {
  return typeof value === "string" && /^[a-z0-9_-]{1,64}$/.test(value)
    ? value
    : null;
}

async function visible(locator: ReturnType<Page["locator"]>) {
  return locator.isVisible().catch(() => false);
}

async function probeEntry(
  context: BrowserContext,
  page: Page,
  loginResponseStatus: number | null,
) {
  const consoleErrorCategories = new Set<string>();
  const pageErrorCategories = new Set<string>();
  const requestFailures: Array<{ pathname: string; category: string }> = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrorCategories.add(browserErrorCategory(message.text()));
    }
  });
  page.on("pageerror", (error) =>
    pageErrorCategories.add(pageErrorCategory(error)),
  );
  page.on("requestfailed", (request) => {
    if (requestFailures.length >= 20) return;
    let pathname = "INVALID_URL";
    try {
      pathname = new URL(request.url()).pathname;
    } catch {
      // Keep only the bounded category for an invalid URL.
    }
    requestFailures.push({
      pathname,
      category: requestFailureCategory(request.failure()?.errorText ?? null),
    });
  });

  let gotoStatus: number | null = null;
  let gotoFailureCategory: string | null = null;
  try {
    const response = await page.goto("/app/c3r-p", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    gotoStatus = response?.status() ?? null;
  } catch (error) {
    gotoFailureCategory =
      error instanceof Error && /timeout/i.test(error.message)
        ? "TIMEOUT"
        : "NAVIGATION_ERROR";
  }

  const runtime = page.locator("[data-c3r-p-practice-runtime]");
  const genericAccess = page.locator(
    '[data-review-os-access-status="denied"]',
  );
  const notFound = page.getByRole("heading", {
    name: "요청하신 화면을 찾을 수 없습니다.",
  });
  const loading = page.getByText("실무 학습 기록을 복원하고 있습니다.", {
    exact: true,
  });
  let c3rPLoadingSurface = await visible(loading);

  const apiProbe = context.request
    .get("/api/review-os/c3r-p", { timeout: 20_000 })
    .then(async (response) => {
      const payload = (await response
        .json()
        .catch(() => null)) as Record<string, unknown> | null;
      return {
        status: response.status(),
        errorCode: boundedErrorCode(payload?.error),
        timedOut: false,
      };
    })
    .catch((error: unknown) => ({
      status: null,
      errorCode: null,
      timedOut: error instanceof Error && /timeout/i.test(error.message),
    }));

  await Promise.race([
    runtime
      .waitFor({ state: "attached", timeout: 20_000 })
      .catch(() => undefined),
    genericAccess
      .waitFor({ state: "attached", timeout: 20_000 })
      .catch(() => undefined),
    notFound
      .waitFor({ state: "attached", timeout: 20_000 })
      .catch(() => undefined),
    page
      .waitForURL((url) => url.pathname === "/login", { timeout: 20_000 })
      .catch(() => undefined),
  ]);
  c3rPLoadingSurface = c3rPLoadingSurface || (await visible(loading));

  const api = await apiProbe;
  let finalPathname = "/__invalid_navigation__";
  try {
    const finalUrl = new URL(page.url());
    if (["http:", "https:"].includes(finalUrl.protocol)) {
      finalPathname = finalUrl.pathname;
    }
  } catch {
    // Keep the metadata-only invalid-navigation sentinel.
  }
  const reachedLogin = finalPathname === "/login";
  const notFoundSurface = await visible(notFound);
  const genericReviewOsAccessState = await visible(genericAccess);
  const c3rPRuntimeMarker = (await runtime.count()) > 0;
  const cookies = (await context.cookies(baseURL)).map((cookie) => ({
    name: cookie.name,
    domain: cookie.domain,
    path: cookie.path,
  }));

  let classification: EntryClassification;
  if (reachedLogin) {
    classification = "C3R_P_ENTRY_AUTH_SESSION_NOT_VISIBLE";
  } else if (genericReviewOsAccessState) {
    classification = "C3R_P_ENTRY_GENERIC_APP_ACCESS_DENIED";
  } else if (
    c3rPRuntimeMarker &&
    finalPathname === "/app/c3r-p" &&
    api.status === 200
  ) {
    classification = "C3R_P_ENTRY_VERIFIED";
  } else if (api.timedOut || (c3rPLoadingSurface && api.status === null)) {
    classification = "C3R_P_ENTRY_CLIENT_API_TIMEOUT";
  } else if (
    notFoundSurface &&
    api.status === 404 &&
    api.errorCode === "not_found"
  ) {
    classification = "C3R_P_ENTRY_C3R_ACCESS_GATE_DENIED";
  } else if (notFoundSurface) {
    classification = "C3R_P_ENTRY_NOT_FOUND";
  } else if (api.status === 404 && api.errorCode === "not_found") {
    classification = "C3R_P_ENTRY_C3R_ACCESS_GATE_DENIED";
  } else {
    classification = "C3R_P_ENTRY_NEXT_RENDER_ERROR";
  }

  return {
    schemaVersion: "inverge.c3r_p.entry_metadata.v1",
    artifactKind: "C3R_P_ENTRY_METADATA",
    classification,
    loginResponseStatus,
    browserSessionVisible:
      loginResponseStatus === 200 && !reachedLogin && cookies.length > 0,
    gotoStatus,
    gotoFailureCategory,
    finalPathname,
    reachedLogin,
    notFoundSurface,
    genericReviewOsAccessState,
    c3rPLoadingSurface,
    c3rPRuntimeMarker,
    apiStatus: api.status,
    apiErrorCode: api.errorCode,
    browserConsoleErrorCategories: [...consoleErrorCategories].sort(),
    pageErrorCategories: [...pageErrorCategories].sort(),
    requestFailures,
    cookies,
  };
}

function writeEntryArtifacts(
  receipt: Awaited<ReturnType<typeof probeEntry>>,
) {
  mkdirSync(dirname(entryEvidencePath), { recursive: true });
  mkdirSync(dirname(playwrightContextPath), { recursive: true });
  writeFileSync(
    entryEvidencePath,
    `${JSON.stringify(receipt, null, 2)}\n`,
    { mode: 0o600 },
  );
  writeFileSync(
    playwrightContextPath,
    `${JSON.stringify(
      {
        schemaVersion: "inverge.c3r_p.playwright_entry_context.v1",
        classification: receipt.classification,
        finalPathname: receipt.finalPathname,
        browserConsoleErrorCategories:
          receipt.browserConsoleErrorCategories,
        pageErrorCategories: receipt.pageErrorCategories,
        requestFailures: receipt.requestFailures,
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );
}

async function expectState(page: Page, state: string) {
  await expect(page.locator("[data-c3r-p-practice-runtime]")).toHaveAttribute(
    "data-c3r-p-state",
    state,
  );
}

async function fillStructuredCalculation(
  page: Page,
  result = "100000000",
) {
  await page.getByTestId("c3r-p-gross-income").fill("120000000");
  await page.getByTestId("c3r-p-operating-expense").fill("20000000");
  await page.getByTestId("c3r-p-result").fill(result);
}

function practiceClaim(
  sourceRevisionId: string,
  result = 100_000_000,
) {
  return {
    sourceRevisionId,
    anchorId: "repair-anchor:practice:synthetic-net-income",
    anchorVersionId: "repair-anchor:practice:synthetic-net-income@1",
    grossIncome: { value: 120_000_000, unit: "KRW_PER_YEAR" },
    operatingExpense: { value: 20_000_000, unit: "KRW_PER_YEAR" },
    operator: "SUBTRACT",
    operandOrder: ["gross_income", "operating_expense"],
    result: { value: result, unit: "KRW_PER_YEAR" },
    sign: "POSITIVE",
    rounding: { mode: "HALF_UP", scale: 0, required: false },
    confirmationMode: "MANUAL_STRUCTURED",
  };
}

test("exact Practice browser-to-Postgres durable loop", async ({ browser }) => {
  requireLocalRuntime();
  if (restoreOnly) {
    const prior = JSON.parse(readFileSync(evidencePath, "utf8"));
    const contextA = await contextFor(browser, emailA, passwordA);
    const pageA = await contextA.newPage();
    await pageA.goto(`/app/c3r-p?recordId=${prior.recordId}`);
    await expectState(pageA, "REOPENED");
    await expect(pageA.getByTestId("c3r-p-ledger")).toContainText(
      "LATER_FAILURE_REOPEN",
    );

    const contextB = await contextFor(browser, emailB, passwordB);
    const denial = await contextB.request.get(
      `/api/review-os/c3r-p?recordId=${prior.recordId}`,
    );
    expect(denial.status()).toBe(404);
    await contextB.close();

    const exportResponse = await contextA.request.post(
      "/api/review-os/c3r-p",
      { data: { action: "export" } },
    );
    expect(exportResponse.status()).toBe(200);
    const exported = await exportResponse.json();
    expect(exported.ok).toBe(true);
    expect(JSON.stringify(exported)).not.toContain(emailA);

    let denyDeleteOnce = true;
    await pageA.route("**/api/review-os/c3r-p", async (route) => {
      const request = route.request();
      if (
        denyDeleteOnce &&
        request.method() === "POST" &&
        request.postDataJSON()?.action === "delete"
      ) {
        denyDeleteOnce = false;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            error: "temporarily_unavailable",
          }),
        });
        return;
      }
      await route.continue();
    });
    pageA.once("dialog", (dialog) => dialog.accept());
    await pageA
      .getByRole("button", { name: "내 C3R-P 데이터 삭제" })
      .click();
    await expect(pageA.getByRole("alert")).toContainText(
      "temporarily_unavailable",
    );
    await expect(pageA.getByTestId("c3r-p-ledger")).toBeVisible();
    await expect(pageA.getByRole("status")).not.toHaveText("삭제 완료");

    await pageA.unroute("**/api/review-os/c3r-p");
    pageA.once("dialog", (dialog) => dialog.accept());
    await pageA
      .getByRole("button", { name: "내 C3R-P 데이터 삭제" })
      .click();
    await expect(pageA.getByRole("status")).toHaveText("삭제 완료");
    const deleted = await contextA.request.get(
      `/api/review-os/c3r-p?recordId=${prior.recordId}`,
    );
    expect(deleted.status()).toBe(404);
    await contextA.close();
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        ...prior,
        restartRestore: true,
        crossUserDenied: true,
        exportDelete: true,
        rawLearnerBodyInEvidence: false,
      })}\n`,
      "utf8",
    );
    return;
  }

  const actorCredentials =
    entryActor === "non_owner"
      ? { email: emailC, password: passwordC }
      : { email: emailA, password: passwordA };
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
  });
  const loginStatus =
    entryActor === "unauthenticated"
      ? null
      : await login(
          context,
          actorCredentials.email,
          actorCredentials.password,
        );
  const page = await context.newPage();
  const receipt = await probeEntry(context, page, loginStatus);
  writeEntryArtifacts(receipt);
  if (receipt.classification !== expectedEntryClassification) {
    throw new Error(
      `C3R-P entry classification ${receipt.classification}; expected ${expectedEntryClassification}`,
    );
  }
  if (entryOnly) {
    await context.close();
    return;
  }
  if (receipt.classification !== "C3R_P_ENTRY_VERIFIED") {
    throw new Error(
      `C3R-P journey requires verified entry, received ${receipt.classification}`,
    );
  }
  expect(receipt.loginResponseStatus).toBe(200);
  expect(receipt.browserSessionVisible).toBe(true);
  expect(receipt.finalPathname).toBe("/app/c3r-p");
  expect(receipt.c3rPRuntimeMarker).toBe(true);
  expect(receipt.apiStatus).toBe(200);
  await expectState(page, "UNSTARTED");

  const foreignHosts = new Set<string>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== new URL(baseURL).origin) foreignHosts.add(url.host);
  });
  await page
    .getByRole("button", { name: "첫 시도와 확신을 고정하기" })
    .click();
  await expectState(page, "D0_OPEN");
  const recordId = new URL(page.url()).searchParams.get("recordId");
  expect(recordId).toMatch(/^[0-9a-f-]{36}$/);

  await page
    .getByRole("button", {
      name: "도움 상태를 먼저 기록하고 가장 큰 간극 보기",
    })
    .click();
  await expectState(page, "FEEDBACK_COMMITTED");
  await expect(page.getByText("가장 큰 간극 1개:")).toBeVisible();

  const committedResponse = await context.request.get(
    `/api/review-os/c3r-p?recordId=${recordId}`,
  );
  expect(committedResponse.status()).toBe(200);
  const committed = await committedResponse.json();
  expect(committed.view.source.revisionId).toBe(C3R_P_SOURCE_REVISION_ID);
  expect(committed.view.restored.record.state).toBe("FEEDBACK_COMMITTED");
  const committedVersion = committed.view.restored.record.record_version;

  const incorrectCalculation = await context.request.post(
    "/api/review-os/c3r-p",
    {
      data: {
        action: "submit_repair",
        commandId: randomUUID(),
        recordId,
        expectedVersion: committedVersion,
        attemptId: randomUUID(),
        claim: practiceClaim(C3R_P_SOURCE_REVISION_ID, 90_000_000),
        evidenceStep: "feedback",
      },
    },
  );
  expect(incorrectCalculation.status()).toBe(409);
  expect(await incorrectCalculation.json()).toEqual({
    ok: false,
    error: "invalid_transition",
  });

  const mismatchedRevision = await context.request.post(
    "/api/review-os/c3r-p",
    {
      data: {
        action: "submit_repair",
        commandId: randomUUID(),
        recordId,
        expectedVersion: committedVersion,
        attemptId: randomUUID(),
        claim: practiceClaim(MISMATCHED_SOURCE_REVISION_ID),
        evidenceStep: "feedback",
      },
    },
  );
  expect(mismatchedRevision.status()).toBe(409);
  expect(await mismatchedRevision.json()).toEqual({
    ok: false,
    error: "invalid_transition",
  });

  const afterRejectedRepairs = await context.request.get(
    `/api/review-os/c3r-p?recordId=${recordId}`,
  );
  expect(afterRejectedRepairs.status()).toBe(200);
  const afterRejected = await afterRejectedRepairs.json();
  expect(afterRejected.view.restored.record.state).toBe("FEEDBACK_COMMITTED");
  expect(afterRejected.view.restored.record.record_version).toBe(committedVersion);

  await fillStructuredCalculation(page);
  const submitRepairResponsePromise = page.waitForResponse((response) => {
    const request = response.request();
    return (
      new URL(response.url()).pathname === "/api/review-os/c3r-p" &&
      request.method() === "POST" &&
      request.postDataJSON()?.action === "submit_repair"
    );
  });
  await page
    .getByRole("button", {
      name: "내가 입력한 구조화 계산으로 수리 저장",
    })
    .click();
  const submitRepairResponse = await submitRepairResponsePromise;
  expect(submitRepairResponse.status()).toBe(200);
  const submittedRepair = await submitRepairResponse.json();
  expect(submittedRepair.ok).toBe(true);
  expect(submittedRepair.view.source.revisionId).toBe(C3R_P_SOURCE_REVISION_ID);
  expect(submittedRepair.view.restored.record.state).toBe("REPAIRED");
  await expectState(page, "REPAIRED");

  const persistedRepairResponse = await context.request.get(
    `/api/review-os/c3r-p?recordId=${recordId}`,
  );
  expect(persistedRepairResponse.status()).toBe(200);
  const persistedRepair = await persistedRepairResponse.json();
  expect(persistedRepair.view.restored.record.state).toBe("REPAIRED");

  await page
    .getByRole("button", {
      name: "도움을 사용한 D+1 기록(독립 성공 아님)",
    })
    .click();
  await expectState(page, "REPAIRED");
  await page
    .getByRole("button", { name: "D+1 무도움 재구성 완료" })
    .click();
  await expectState(page, "D1_COMPLETE");

  const secondBrowser = await contextFor(
    browser,
    emailA,
    passwordA,
  );
  const secondPage = await secondBrowser.newPage();
  await secondPage.goto(`/app/c3r-p?recordId=${recordId}`);
  await expectState(secondPage, "D1_COMPLETE");
  await fillStructuredCalculation(secondPage);
  await secondPage
    .getByRole("button", {
      name: "다른 문항·다른 화면에서 봉인된 D+7 전이 완료",
    })
    .click();
  await expectState(secondPage, "D7_COMPLETE");
  await secondPage
    .getByRole("button", { name: "시간 기반 재출현 독립 수행 완료" })
    .click();
  await expectState(secondPage, "CLOSED");
  await secondPage.getByTestId("c3r-p-result").fill("90000000");
  await secondPage
    .getByRole("button", { name: "입력한 후속 실패로 간극 다시 열기" })
    .click();
  await expectState(secondPage, "REOPENED");
  await secondPage.getByRole("button", { name: "Today 90분" }).click();
  await expect(secondPage.getByText("계획 상태: PROPOSED")).toBeVisible();
  await expect(secondPage.getByText("dayComplete: false")).toBeVisible();
  await secondPage.getByRole("button", { name: "편집" }).click();
  await expect(secondPage.getByText("계획 상태: EDITED")).toBeVisible();
  await secondPage.reload();
  await expectState(secondPage, "REOPENED");
  await expect(secondPage.getByTestId("c3r-p-ledger")).toBeVisible();
  await expect(secondPage.getByText("계획 상태: EDITED")).toBeVisible();
  expect(foreignHosts.size).toBe(0);
  await secondBrowser.close();
  await context.close();

  writeFileSync(
    evidencePath,
    `${JSON.stringify({
      recordId,
      browserToPostgres: true,
      secondBrowserRestore: true,
      assistedNotIndependent: true,
      d1Unaided: true,
      d7DifferentItemAndSurface: true,
      timedRecurrence: true,
      laterFailureReopen: true,
      deterministicPlanner: true,
      providerCalls: 0,
    })}\n`,
    "utf8",
  );
});
