import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
  type Route,
} from "@playwright/test";
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
const C3R_P_PRIMARY_ANCHOR_ID = "repair-anchor:practice:synthetic-net-income";
const C3R_P_PRIMARY_ANCHOR_VERSION_ID =
  "repair-anchor:practice:synthetic-net-income@1";
const C3R_P_TRANSFER_ANCHOR_ID =
  C3R_P_PRIMARY_ANCHOR_ID;
const C3R_P_TRANSFER_ANCHOR_VERSION_ID =
  "repair-anchor:practice:synthetic-net-income@d7-transfer-v1";

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

function dashboardEvidenceStepRoute(evidenceStep: "d7" | "recurrence") {
  return async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      request.method() === "GET" &&
      url.pathname === "/api/review-os/c3r-p"
    ) {
      url.searchParams.set("evidenceStep", evidenceStep);
      await route.continue({ url: url.toString() });
      return;
    }
    await route.continue();
  };
}

async function settleBrowserEvents(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
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
  grossIncome = "120000000",
  operatingExpense = "20000000",
) {
  await page.getByTestId("c3r-p-gross-income").fill(grossIncome);
  await page.getByTestId("c3r-p-operating-expense").fill(operatingExpense);
  await page.getByTestId("c3r-p-result").fill(result);
}

function practiceClaim(
  sourceRevisionId: string,
  result = 100_000_000,
  grossIncome = 120_000_000,
  operatingExpense = 20_000_000,
  transferTask = false,
) {
  return {
    sourceRevisionId,
    anchorId: transferTask ? C3R_P_TRANSFER_ANCHOR_ID : C3R_P_PRIMARY_ANCHOR_ID,
    anchorVersionId: transferTask
      ? C3R_P_TRANSFER_ANCHOR_VERSION_ID
      : C3R_P_PRIMARY_ANCHOR_VERSION_ID,
    grossIncome: { value: grossIncome, unit: "KRW_PER_YEAR" },
    operatingExpense: { value: operatingExpense, unit: "KRW_PER_YEAR" },
    operator: "SUBTRACT",
    operandOrder: ["gross_income", "operating_expense"],
    result: { value: result, unit: "KRW_PER_YEAR" },
    sign: "POSITIVE",
    rounding: { mode: "HALF_UP", scale: 0, required: false },
    confirmationMode: "MANUAL_STRUCTURED",
  };
}

async function createAcceptedPlan(
  context: BrowserContext,
  recordId: string,
  kind: "TODAY" | "FULL_DAY",
  evidenceStep: string,
) {
  const planId = randomUUID();
  const createdResponse = await context.request.post("/api/review-os/c3r-p", {
    data: {
      action: "create_plan",
      commandId: randomUUID(),
      recordId,
      planId,
      kind,
      availableMinutes: kind === "TODAY" ? 90 : 240,
      evidenceStep,
    },
  });
  expect(createdResponse.status()).toBe(200);
  const created = await createdResponse.json();
  expect(created.view.currentPlan).toMatchObject({
    planId,
    state: "PROPOSED",
    blocks: [expect.objectContaining({ executionState: "PENDING" })],
  });
  const acceptedResponse = await context.request.post("/api/review-os/c3r-p", {
    data: {
      action: "decide_plan",
      commandId: randomUUID(),
      recordId,
      planId,
      expectedVersion: created.view.currentPlan.recordVersion,
      decision: "ACCEPT",
      blocks: null,
      evidenceStep,
    },
  });
  expect(acceptedResponse.status()).toBe(200);
  const accepted = await acceptedResponse.json();
  expect(accepted.view.currentPlan).toMatchObject({ planId, state: "ACCEPTED" });
  return accepted.view.currentPlan;
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
    await expect(pageA.getByTestId("c3r-p-ledger")).toContainText(
      "REOPENED_COMPLETED",
    );

    const contextB = await contextFor(browser, emailB, passwordB);
    const denial = await contextB.request.get(
      `/api/review-os/c3r-p?recordId=${prior.recordId}`,
    );
    expect(denial.status()).toBe(404);
    const foreignRecord = await contextB.request.get(
      `/api/review-os/c3r-p?recordId=${prior.foreignRecordId}`,
    );
    expect(foreignRecord.status()).toBe(200);

    const exportResponse = await contextA.request.post(
      "/api/review-os/c3r-p",
      { data: { action: "export" } },
    );
    expect(exportResponse.status()).toBe(200);
    const exported = await exportResponse.json();
    expect(exported.ok).toBe(true);
    const learnerExport = exported.export;
    for (const collection of [
      "records", "attempts", "assistanceEvents", "failureNotes", "gaps",
      "ledger", "plans", "planBlocks", "transferTasks", "commandReceipts",
    ]) {
      expect(Array.isArray(learnerExport[collection]), collection).toBe(true);
    }
    const assistanceEvents = learnerExport.assistanceEvents.filter(
      (event: { record_id: string }) => event.record_id === prior.recordId,
    );
    expect(assistanceEvents).toHaveLength(2);
    expect(assistanceEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        record_id: prior.recordId,
        gap_id: prior.gapId,
        assistance_kind: "BIGGEST_GAP",
        assistance_level: 1,
      }),
      expect.objectContaining({
        record_id: prior.recordId,
        gap_id: prior.gapId,
        assistance_kind: "SMALLEST_SCAFFOLD",
        assistance_level: 1,
        attempt_id: expect.any(String),
        source_id: expect.any(String),
        revision_id: C3R_P_SOURCE_REVISION_ID,
        item_id: expect.any(String),
      }),
    ]));
    const todayBlocks = learnerExport.planBlocks.filter(
      (block: { plan_id: string }) => block.plan_id === prior.todayPlanId,
    );
    const fullDayBlocks = learnerExport.planBlocks.filter(
      (block: { plan_id: string }) => block.plan_id === prior.fullDayPlanId,
    );
    const supersededFullDayBlocks = learnerExport.planBlocks.filter(
      (block: { plan_id: string }) => block.plan_id === prior.staleFullDayPlanId,
    );
    expect(todayBlocks).toEqual([expect.objectContaining({
      id: prior.editedTodayBlockId,
      record_id: prior.recordId,
      gap_id: prior.gapId,
      minutes: 25,
      execution_state: "PENDING",
    })]);
    expect(fullDayBlocks).toEqual([expect.objectContaining({
      id: prior.fullDayBlockId,
      record_id: prior.recordId,
      gap_id: prior.gapId,
      review_phase: "REOPENED_REVIEW",
      execution_state: "COMPLETE",
    })]);
    expect(supersededFullDayBlocks).toEqual([expect.objectContaining({
      id: prior.staleFullDayBlockId,
      record_id: prior.recordId,
      gap_id: prior.gapId,
      review_phase: "REOPENED_REVIEW",
      execution_state: "PENDING",
    })]);
    expect(learnerExport.planBlocks).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: prior.initialTodayBlockId }),
    ]));
    expect(learnerExport.plans).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: prior.todayPlanId, plan_kind: "TODAY" }),
      expect.objectContaining({ id: prior.fullDayPlanId, plan_kind: "FULL_DAY" }),
    ]));
    expect(learnerExport.attempts.filter(
      (attempt: { id: string }) => attempt.id === prior.completionAttemptId,
    )).toHaveLength(1);
    expect(learnerExport.transferTasks).toEqual([
      expect.objectContaining({
        taskId: prior.transferTaskId,
        recordId: prior.recordId,
        itemId: prior.transferItemId,
        surfaceId: prior.transferSurfaceId,
        presentedAt: expect.any(String),
        completedAt: expect.any(String),
      }),
    ]);
    expect(JSON.stringify(learnerExport.transferTasks)).not.toContain("120000000");
    expect(learnerExport.commandReceipts.length).toBeGreaterThan(0);
    expect(JSON.stringify(learnerExport.commandReceipts)).not.toContain(
      "request_sha256",
    );
    expect(learnerExport.ledger.filter(
      (entry: { entry_kind: string }) => entry.entry_kind === "REOPENED_COMPLETED",
    )).toHaveLength(1);
    const serializedExport = JSON.stringify(exported);
    expect(serializedExport).not.toContain(emailA);
    expect(serializedExport).not.toContain(emailB);
    expect(serializedExport).not.toContain(prior.foreignRecordId);
    expect(serializedExport).not.toContain(prior.foreignAssistanceEventId);

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
    await expect(
      pageA.getByRole("alert").filter({ hasText: "temporarily_unavailable" }),
    ).toContainText("temporarily_unavailable");
    await expect(pageA.getByTestId("c3r-p-ledger")).toBeVisible();
    await expect(
      pageA.getByRole("status").filter({ hasText: "삭제 완료" }),
    ).toHaveCount(0);

    await pageA.unroute("**/api/review-os/c3r-p");
    pageA.once("dialog", (dialog) => dialog.accept());
    const deleteResponsePromise = pageA.waitForResponse((response) => {
      const request = response.request();
      return (
        new URL(response.url()).pathname === "/api/review-os/c3r-p" &&
        request.method() === "POST" &&
        request.postDataJSON()?.action === "delete"
      );
    });
    await pageA
      .getByRole("button", { name: "내 C3R-P 데이터 삭제" })
      .click();
    const deleteResponse = await deleteResponsePromise;
    expect(deleteResponse.status()).toBe(200);
    expect(await deleteResponse.json()).toMatchObject({
      ok: true,
      result: {
        deletedRecords: 1,
        deletedPlans: 9,
        status: "deleted",
      },
    });
    await expect(pageA.getByRole("status")).toHaveText("삭제 완료");
    await expect(pageA).toHaveURL(/\/app\/c3r-p$/u);
    const deleted = await contextA.request.get(
      `/api/review-os/c3r-p?recordId=${prior.recordId}`,
    );
    expect(deleted.status()).toBe(404);
    const emptyExportResponse = await contextA.request.post(
      "/api/review-os/c3r-p",
      { data: { action: "export" } },
    );
    expect(emptyExportResponse.status()).toBe(200);
    const emptyExport = (await emptyExportResponse.json()).export;
    for (const collection of [
      "records", "attempts", "assistanceEvents", "failureNotes", "gaps",
      "ledger", "plans", "planBlocks", "transferTasks", "commandReceipts",
    ]) {
      expect(emptyExport[collection]).toEqual([]);
    }
    const unaffectedForeignRecord = await contextB.request.get(
      `/api/review-os/c3r-p?recordId=${prior.foreignRecordId}`,
    );
    expect(unaffectedForeignRecord.status()).toBe(200);
    await contextB.close();
    await contextA.close();
    writeFileSync(
      evidencePath,
      `${JSON.stringify({
        ...prior,
        restartRestore: true,
        crossUserDenied: true,
        exportDelete: true,
        assistanceExportedExactlyOnce: true,
        todayAndFullDayBlocksExported: true,
        editedPlanBlocksExportFinalValues: true,
        crossUserExportRowsAbsent: true,
        emptyExportCollectionsAreArrays: true,
        deleteRemovesExportedData: true,
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
  const prematureAssistedD1 = await context.request.post(
    "/api/review-os/c3r-p",
    { data: {
      action: "record_assisted_review",
      commandId: randomUUID(),
      recordId,
      expectedVersion: persistedRepair.view.restored.record.record_version,
      attemptId: randomUUID(),
      claim: practiceClaim(C3R_P_SOURCE_REVISION_ID),
      evidenceStep: "feedback",
    } },
  );
  expect(prematureAssistedD1.status()).toBe(409);
  expect(await prematureAssistedD1.json()).toEqual({
    ok: false,
    error: "invalid_transition",
  });
  const afterPrematureAssistedD1 = await context.request.get(
    `/api/review-os/c3r-p?recordId=${recordId}`,
  );
  expect((await afterPrematureAssistedD1.json()).view.restored).toMatchObject({
    record: {
      state: "REPAIRED",
      record_version: persistedRepair.view.restored.record.record_version,
    },
    assistanceEvents: [expect.objectContaining({ assistance_kind: "BIGGEST_GAP" })],
  });
  await page.goto("/app/c3r-p");
  await expectState(page, "REPAIRED");
  await expect(page.getByRole("button", { name: "첫 시도와 확신을 고정하기" })).toHaveCount(0);
  const supersededD1Plan = await createAcceptedPlan(context, recordId, "TODAY", "d1");
  expect(supersededD1Plan.blocks[0]).toMatchObject({ reviewPhase: "D1" });
  const rejectedD1PlanId = randomUUID();
  const proposedD1PlanResponse = await context.request.post(
    "/api/review-os/c3r-p",
    { data: {
      action: "create_plan",
      commandId: randomUUID(),
      recordId,
      planId: rejectedD1PlanId,
      kind: "TODAY",
      availableMinutes: 90,
      evidenceStep: "d1Fresh",
    } },
  );
  expect(proposedD1PlanResponse.status()).toBe(200);
  const proposedD1Plan = await proposedD1PlanResponse.json();
  expect(proposedD1Plan.view.currentPlan).toMatchObject({
    planId: rejectedD1PlanId,
    state: "PROPOSED",
  });
  expect(proposedD1Plan.view.dashboard.plans).toEqual(expect.arrayContaining([
    expect.objectContaining({
      planId: supersededD1Plan.planId,
      state: "STALE",
      blocks: [expect.objectContaining({
        blockId: supersededD1Plan.blocks[0].blockId,
        executionState: "PENDING",
      })],
      dayComplete: false,
    }),
  ]));
  const rejectedD1PlanResponse = await context.request.post(
    "/api/review-os/c3r-p",
    { data: {
      action: "decide_plan",
      commandId: randomUUID(),
      recordId,
      planId: rejectedD1PlanId,
      expectedVersion: proposedD1Plan.view.currentPlan.recordVersion,
      decision: "REJECT",
      blocks: null,
      evidenceStep: "d1Fresh",
    } },
  );
  expect(rejectedD1PlanResponse.status()).toBe(200);
  const rejectedD1Plan = await rejectedD1PlanResponse.json();
  expect(rejectedD1Plan.view.currentPlan).toBeNull();
  const staleD1Plan = await createAcceptedPlan(
    context,
    recordId,
    "TODAY",
    "d1Fresh",
  );
  expect(staleD1Plan.blocks[0]).toMatchObject({ reviewPhase: "D1" });
  await page.goto("/app/c3r-p");
  await expectState(page, "REPAIRED");
  await fillStructuredCalculation(page);

  const assistedD1ResponsePromise = page.waitForResponse((response) =>
    response.request().postDataJSON()?.action === "record_assisted_review",
  );
  await page
    .getByRole("button", {
      name: "도움을 사용한 D+1 기록(독립 성공 아님)",
    })
    .click();
  const assistedD1Response = await assistedD1ResponsePromise;
  expect(assistedD1Response.status()).toBe(200);
  await expectState(page, "REPAIRED");
  const assistedHistoryResponse = await context.request.get(
    `/api/review-os/c3r-p?recordId=${recordId}`,
  );
  const assistedHistory = await assistedHistoryResponse.json();
  expect(assistedHistory.view.restored.record).toMatchObject({
    state: "REPAIRED",
    record_version: persistedRepair.view.restored.record.record_version,
  });
  expect(assistedHistory.view.restored.assistanceEvents).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        assistance_kind: "SMALLEST_SCAFFOLD",
        assistance_level: 1,
        record_id: recordId,
        gap_id: assistedHistory.view.restored.gaps[0].id,
        source_id: assistedHistory.view.restored.record.source_id,
        revision_id: assistedHistory.view.restored.record.revision_id,
        item_id: assistedHistory.view.restored.record.item_id,
      }),
    ]),
  );
  expect(assistedHistory.view.restored.ledger).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ entry_kind: "D1_ASSISTED", contains_body: false }),
    ]),
  );
  await page.reload();
  await expectState(page, "REPAIRED");
  await expect(page.getByTestId("c3r-p-ledger")).toContainText("D1_ASSISTED");
  const staleReviewStateCompletion = await context.request.post(
    "/api/review-os/c3r-p",
    { data: {
      action: "complete_d1",
      commandId: randomUUID(),
      recordId,
      expectedVersion: persistedRepair.view.restored.record.record_version,
      attemptId: randomUUID(),
      claim: practiceClaim(C3R_P_SOURCE_REVISION_ID),
      planBlockId: staleD1Plan.blocks[0].blockId,
      planId: staleD1Plan.planId,
      planVersion: staleD1Plan.recordVersion,
      evidenceStep: "d1",
    } },
  );
  expect(staleReviewStateCompletion.status()).toBe(409);
  await fillStructuredCalculation(page);
  const d1Plan = await createAcceptedPlan(context, recordId, "TODAY", "d1Fresh");
  expect(d1Plan.blocks[0]).toMatchObject({ reviewPhase: "D1" });
  await page.reload();
  await fillStructuredCalculation(page);
  await page
    .getByRole("button", { name: "D+1 무도움 재구성 완료" })
    .click();
  await expectState(page, "D1_COMPLETE");
  const completedD1PlanResponse = await context.request.get(
    `/api/review-os/c3r-p?recordId=${recordId}`,
  );
  const completedD1Plan = await completedD1PlanResponse.json();
  expect(completedD1Plan.view.dashboard.plans).toEqual(expect.arrayContaining([
    expect.objectContaining({
      planId: d1Plan.planId,
      dayComplete: true,
      blocks: [expect.objectContaining({
        blockId: d1Plan.blocks[0].blockId,
        reviewPhase: "D1",
        executionState: "COMPLETE",
      })],
    }),
  ]));
  const sealedTransferResponse = await context.request.get(
    `/api/review-os/c3r-p?recordId=${recordId}`,
  );
  const sealedTransfer = await sealedTransferResponse.json();
  expect(sealedTransfer.view.restored.transferTask).toMatchObject({
    recordId,
    state: "SEALED",
    prompt: null,
  });
  expect(sealedTransfer.view.dashboard.queue).toEqual(expect.arrayContaining([
    expect.objectContaining({
      recordId,
      gapId: sealedTransfer.view.restored.gaps[0].id,
      state: "D1_COMPLETE",
      gapState: "OPEN",
      reviewPhase: "D7_TRANSFER",
      eligible: false,
    }),
  ]));
  const transferTaskId = sealedTransfer.view.restored.transferTask.taskId;
  const transferItemId = sealedTransfer.view.restored.transferTask.itemId;
  const transferSurfaceId = sealedTransfer.view.restored.transferTask.surfaceId;
  expect(transferItemId).not.toBe(sealedTransfer.view.restored.record.item_id);
  expect(transferSurfaceId).not.toBe(
    sealedTransfer.view.restored.record.initial_surface_id,
  );

  const prematureD7Presentation = await context.request.post(
    "/api/review-os/c3r-p",
    { data: {
      action: "present_d7_transfer_task",
      commandId: randomUUID(),
      recordId,
      expectedVersion: sealedTransfer.view.restored.record.record_version,
      transferTaskId,
      evidenceStep: "d1Fresh",
    } },
  );
  expect(prematureD7Presentation.status()).toBe(409);
  expect(await prematureD7Presentation.json()).toEqual({
    ok: false,
    error: "invalid_transition",
  });

  const earlyD7Requests: string[] = [];
  const foreignQueueRecordId = randomUUID();
  const preDueD7Route = async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const action = request.method() === "POST"
      ? request.postDataJSON()?.action
      : null;
    if (["present_d7_transfer_task", "complete_d7_transfer"].includes(action)) {
      earlyD7Requests.push(action);
      await route.abort();
      return;
    }
    if (request.method() === "GET" && url.pathname === "/api/review-os/c3r-p") {
      const response = await route.fetch();
      const body = await response.json();
      body.view.dashboard.queue.push(
        {
          recordId: foreignQueueRecordId,
          gapId: randomUUID(),
          state: "D1_COMPLETE",
          gapState: "OPEN",
          reviewPhase: "D7_TRANSFER",
          dueAt: "2026-08-23T00:00:00.000Z",
          eligible: true,
        },
        {
          recordId,
          gapId: sealedTransfer.view.restored.gaps[0].id,
          state: "CLOSED",
          gapState: "OPEN",
          reviewPhase: "D7_TRANSFER",
          dueAt: "2026-08-23T00:00:00.000Z",
          eligible: true,
        },
      );
      await route.fulfill({ response, json: body });
      return;
    }
    await route.continue();
  };
  await page.route("**/api/review-os/c3r-p", preDueD7Route);
  await page.reload();
  const preDueD7Button = page.getByRole("button", {
    name: "D+7 전이 과업 열기",
  });
  await expect(preDueD7Button).toBeDisabled();
  await expect(page.getByTestId("c3r-p-d7-eligibility")).toContainText(
    sealedTransfer.view.restored.gaps[0].d7_due_at,
  );
  await expect(page.getByTestId("c3r-p-transfer-prompt")).toHaveCount(0);
  await preDueD7Button.evaluate((element) => {
    element.click();
    element.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      key: "Enter",
    }));
    element.dispatchEvent(new KeyboardEvent("keyup", {
      bubbles: true,
      key: "Enter",
    }));
  });
  await settleBrowserEvents(page);
  expect(earlyD7Requests).toEqual([]);
  await page.unroute("**/api/review-os/c3r-p", preDueD7Route);

  const secondBrowser = await contextFor(
    browser,
    emailA,
    passwordA,
  );
  const secondPage = await secondBrowser.newPage();
  await secondPage.goto(`/app/c3r-p?recordId=${recordId}`);
  await expectState(secondPage, "D1_COMPLETE");
  await expect(secondPage.getByTestId("c3r-p-transfer-task")).toHaveAttribute(
    "data-transfer-task-state",
    "SEALED",
  );
  await expect(secondPage.getByTestId("c3r-p-transfer-prompt")).toHaveCount(0);
  await expect(secondPage.getByRole("button", {
    name: "D+7 전이 과업 열기",
  })).toBeDisabled();
  await secondPage.reload();
  await expect(secondPage.getByRole("button", {
    name: "D+7 전이 과업 열기",
  })).toBeDisabled();

  const d7EvidenceRouteA = dashboardEvidenceStepRoute("d7");
  const d7EvidenceRouteB = dashboardEvidenceStepRoute("d7");
  await page.route("**/api/review-os/c3r-p", d7EvidenceRouteA);
  await secondPage.route("**/api/review-os/c3r-p", d7EvidenceRouteB);
  await Promise.all([page.reload(), secondPage.reload()]);
  await expect(page.getByRole("button", {
    name: "D+7 전이 과업 열기",
  })).toBeEnabled();
  await expect(secondPage.getByRole("button", {
    name: "D+7 전이 과업 열기",
  })).toBeEnabled();
  await expect(secondPage.getByTestId("c3r-p-d7-eligibility")).toHaveCount(0);
  await secondPage.reload();
  await expect(secondPage.getByRole("button", {
    name: "D+7 전이 과업 열기",
  })).toBeEnabled();
  const presentResponsePromise = secondPage.waitForResponse((response) =>
    response.request().postDataJSON()?.action === "present_d7_transfer_task",
  );
  await secondPage
    .getByRole("button", { name: "D+7 전이 과업 열기" })
    .click();
  const presentResponse = await presentResponsePromise;
  expect(presentResponse.status()).toBe(200);
  await expect(secondPage.getByTestId("c3r-p-transfer-task")).toHaveAttribute(
    "data-transfer-task-state",
    "PRESENTED",
  );
  await expect(secondPage.getByTestId("c3r-p-transfer-prompt")).toContainText(
    "150,000,000원",
  );
  await expect(secondPage.getByTestId("c3r-p-transfer-prompt")).toContainText(
    "30,000,000원",
  );
  await expect(secondPage.getByTestId("c3r-p-transfer-prompt")).not.toContainText(
    "120,000,000원",
  );

  const presentedViewResponse = await context.request.get(
    `/api/review-os/c3r-p?recordId=${recordId}`,
  );
  const presentedView = await presentedViewResponse.json();
  const d1Version = presentedView.view.restored.record.record_version;
  const originalAnswerReuse = await context.request.post(
    "/api/review-os/c3r-p",
    { data: {
      action: "complete_d7_transfer",
      commandId: randomUUID(),
      recordId,
      expectedVersion: d1Version,
      attemptId: randomUUID(),
      claim: practiceClaim(C3R_P_SOURCE_REVISION_ID),
      transferTaskId,
      planBlockId: null,
      evidenceStep: "d7",
    } },
  );
  expect(originalAnswerReuse.status()).toBe(409);
  const reusedOriginalAnchorVersion = await context.request.post(
    "/api/review-os/c3r-p",
    { data: {
      action: "complete_d7_transfer",
      commandId: randomUUID(),
      recordId,
      expectedVersion: d1Version,
      attemptId: randomUUID(),
      claim: practiceClaim(
        C3R_P_SOURCE_REVISION_ID,
        120_000_000,
        150_000_000,
        30_000_000,
      ),
      transferTaskId,
      planBlockId: null,
      evidenceStep: "d7",
    } },
  );
  expect(reusedOriginalAnchorVersion.status()).toBe(409);
  const fabricatedTransfer = await context.request.post(
    "/api/review-os/c3r-p",
    { data: {
      action: "complete_d7_transfer",
      commandId: randomUUID(),
      recordId,
      expectedVersion: d1Version,
      attemptId: randomUUID(),
      claim: practiceClaim(
        C3R_P_SOURCE_REVISION_ID,
        120_000_000,
        150_000_000,
        30_000_000,
        true,
      ),
      transferTaskId: randomUUID(),
      planBlockId: null,
      evidenceStep: "d7",
    } },
  );
  expect(fabricatedTransfer.status()).toBe(409);

  const d7Plan = await createAcceptedPlan(
    context,
    recordId,
    "FULL_DAY",
    "d7",
  );
  expect(d7Plan.blocks[0]).toMatchObject({ reviewPhase: "D7_TRANSFER" });
  await secondPage.reload();
  await expect(secondPage.getByTestId("c3r-p-transfer-task")).toHaveAttribute(
    "data-transfer-task-state",
    "PRESENTED",
  );
  await fillStructuredCalculation(
    secondPage,
    "120000000",
    "150000000",
    "30000000",
  );
  const transferSubmitPromise = secondPage.waitForRequest((request) =>
    request.postDataJSON()?.action === "complete_d7_transfer",
  );
  await secondPage
    .getByRole("button", { name: "제시된 D+7 전이 과업 제출" })
    .click();
  const transferSubmit = await transferSubmitPromise;
  expect(transferSubmit.postDataJSON()).toMatchObject({
    transferTaskId,
    claim: {
      anchorId: C3R_P_TRANSFER_ANCHOR_ID,
      anchorVersionId: C3R_P_TRANSFER_ANCHOR_VERSION_ID,
      grossIncome: { value: 150_000_000 },
      operatingExpense: { value: 30_000_000 },
      result: { value: 120_000_000 },
    },
  });
  await expectState(secondPage, "D7_COMPLETE");
  const transferredResponse = await context.request.get(
    `/api/review-os/c3r-p?recordId=${recordId}`,
  );
  const transferred = await transferredResponse.json();
  expect(transferred.view.restored.transferTask).toMatchObject({
    taskId: transferTaskId,
    state: "COMPLETED",
  });
  expect(transferred.view.restored.attempts).toEqual(expect.arrayContaining([
    expect.objectContaining({
      phase: "D7_TRANSFER",
      transfer_task_id: transferTaskId,
      item_id: transferItemId,
      surface_id: transferSurfaceId,
    }),
  ]));
  expect(transferred.view.dashboard.plans).toEqual(expect.arrayContaining([
    expect.objectContaining({
      planId: d7Plan.planId,
      dayComplete: true,
      blocks: [expect.objectContaining({
        blockId: d7Plan.blocks[0].blockId,
        reviewPhase: "D7_TRANSFER",
        executionState: "COMPLETE",
      })],
    }),
  ]));
  expect(transferred.view.dashboard.queue).toEqual(expect.arrayContaining([
    expect.objectContaining({
      recordId,
      gapId: transferred.view.restored.gaps[0].id,
      state: "D7_COMPLETE",
      gapState: "OPEN",
      reviewPhase: "RECURRENCE",
      eligible: false,
    }),
  ]));
  await expect(secondPage.getByTestId("c3r-p-recurrence-eligibility")).toContainText(
    transferred.view.restored.gaps[0].recurrence_due_at,
  );
  const preDueRecurrenceButton = secondPage.getByRole("button", {
    name: "시간 기반 재출현 독립 수행 완료",
  });
  await expect(preDueRecurrenceButton).toBeDisabled();

  const prematureRecurrence = await context.request.post(
    "/api/review-os/c3r-p",
    { data: {
      action: "complete_recurrence",
      commandId: randomUUID(),
      recordId,
      expectedVersion: transferred.view.restored.record.record_version,
      attemptId: randomUUID(),
      claim: practiceClaim(C3R_P_SOURCE_REVISION_ID),
      planBlockId: null,
      planId: null,
      planVersion: null,
      evidenceStep: "d7",
    } },
  );
  expect(prematureRecurrence.status()).toBe(409);

  const earlyRecurrenceRequests: string[] = [];
  const preDueRecurrenceRoute = async (route: Route) => {
    const request = route.request();
    if (
      request.method() === "POST" &&
      request.postDataJSON()?.action === "complete_recurrence"
    ) {
      earlyRecurrenceRequests.push("complete_recurrence");
      await route.abort();
      return;
    }
    await route.continue();
  };
  await secondPage.route("**/api/review-os/c3r-p", preDueRecurrenceRoute);
  await preDueRecurrenceButton.evaluate((element) => {
    element.click();
    element.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      key: "Enter",
    }));
    element.dispatchEvent(new KeyboardEvent("keyup", {
      bubbles: true,
      key: "Enter",
    }));
  });
  await settleBrowserEvents(secondPage);
  expect(earlyRecurrenceRequests).toEqual([]);
  await secondPage.unroute("**/api/review-os/c3r-p", preDueRecurrenceRoute);

  await page.unroute("**/api/review-os/c3r-p", d7EvidenceRouteA);
  await secondPage.unroute("**/api/review-os/c3r-p", d7EvidenceRouteB);
  const recurrenceEvidenceRouteA = dashboardEvidenceStepRoute("recurrence");
  const recurrenceEvidenceRouteB = dashboardEvidenceStepRoute("recurrence");
  await page.route("**/api/review-os/c3r-p", recurrenceEvidenceRouteA);
  await secondPage.route("**/api/review-os/c3r-p", recurrenceEvidenceRouteB);
  await Promise.all([page.reload(), secondPage.reload()]);
  await expect(page.getByRole("button", {
    name: "시간 기반 재출현 독립 수행 완료",
  })).toBeEnabled();
  await expect(secondPage.getByRole("button", {
    name: "시간 기반 재출현 독립 수행 완료",
  })).toBeEnabled();
  await expect(secondPage.getByTestId("c3r-p-recurrence-eligibility")).toHaveCount(0);

  const recurrencePlan = await createAcceptedPlan(
    context,
    recordId,
    "TODAY",
    "recurrence",
  );
  expect(recurrencePlan.blocks[0]).toMatchObject({ reviewPhase: "RECURRENCE" });
  await secondPage.reload();
  await expectState(secondPage, "D7_COMPLETE");
  await expect(secondPage.getByRole("button", {
    name: "시간 기반 재출현 독립 수행 완료",
  })).toBeEnabled();
  await fillStructuredCalculation(secondPage);
  await secondPage
    .getByRole("button", { name: "시간 기반 재출현 독립 수행 완료" })
    .click();
  await expectState(secondPage, "CLOSED");
  const completedRecurrencePlanResponse = await context.request.get(
    `/api/review-os/c3r-p?recordId=${recordId}`,
  );
  const completedRecurrencePlan = await completedRecurrencePlanResponse.json();
  expect(completedRecurrencePlan.view.dashboard.plans).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        planId: recurrencePlan.planId,
        dayComplete: true,
        blocks: [expect.objectContaining({
          blockId: recurrencePlan.blocks[0].blockId,
          reviewPhase: "RECURRENCE",
          executionState: "COMPLETE",
        })],
      }),
    ]),
  );
  await secondPage.getByTestId("c3r-p-result").fill("90000000");
  await secondPage
    .getByRole("button", { name: "입력한 후속 실패로 간극 다시 열기" })
    .click();
  await expectState(secondPage, "REOPENED");
  const reopenedResponse = await context.request.get(
    `/api/review-os/c3r-p?recordId=${recordId}`,
  );
  expect(reopenedResponse.status()).toBe(200);
  const reopened = await reopenedResponse.json();
  const reopenedVersion = reopened.view.restored.record.record_version;
  const gapId = reopened.view.restored.gaps[0].id;

  const contextB = await contextFor(browser, emailB, passwordB);
  const foreignRecordId = randomUUID();
  const foreignStart = await contextB.request.post("/api/review-os/c3r-p", {
    data: {
      action: "start",
      commandId: randomUUID(),
      recordId: foreignRecordId,
      attemptId: randomUUID(),
      attemptBody: "다른 학습자의 독립된 첫 시도입니다.",
      prediction: "likely_partial",
      confidence: "medium",
      evidenceStep: "d0",
    },
  });
  expect(foreignStart.status()).toBe(200);
  const foreignAssistanceEventId = randomUUID();
  const foreignFeedback = await contextB.request.post("/api/review-os/c3r-p", {
    data: {
      action: "commit_feedback",
      commandId: randomUUID(),
      recordId: foreignRecordId,
      expectedVersion: 1,
      gapId: randomUUID(),
      failureNoteId: randomUUID(),
      assistanceEventId: foreignAssistanceEventId,
      failureNote: "다른 학습자에게만 속하는 실패 메모입니다.",
      evidenceStep: "feedback",
    },
  });
  expect(foreignFeedback.status()).toBe(200);
  const foreignFeedbackBody = await foreignFeedback.json();
  const foreignRepair = await contextB.request.post("/api/review-os/c3r-p", {
    data: {
      action: "submit_repair",
      commandId: randomUUID(),
      recordId: foreignRecordId,
      expectedVersion: foreignFeedbackBody.view.restored.record.record_version,
      attemptId: randomUUID(),
      claim: practiceClaim(C3R_P_SOURCE_REVISION_ID),
      evidenceStep: "feedback",
    },
  });
  expect(foreignRepair.status()).toBe(200);
  const foreignRepairBody = await foreignRepair.json();
  const planlessCompletion = await contextB.request.post(
    "/api/review-os/c3r-p",
    { data: {
      action: "complete_d1",
      commandId: randomUUID(),
      recordId: foreignRecordId,
      expectedVersion: foreignRepairBody.view.restored.record.record_version,
      attemptId: randomUUID(),
      claim: practiceClaim(C3R_P_SOURCE_REVISION_ID),
      planBlockId: null,
      planId: null,
      planVersion: null,
      evidenceStep: "d1",
    } },
  );
  expect(planlessCompletion.status()).toBe(200);
  expect((await planlessCompletion.json()).view.restored.record.state).toBe(
    "D1_COMPLETE",
  );

  const assistedRetry = await context.request.post("/api/review-os/c3r-p", {
    data: {
      action: "record_assisted_review",
      commandId: randomUUID(),
      recordId,
      expectedVersion: reopenedVersion,
      attemptId: randomUUID(),
      claim: practiceClaim(C3R_P_SOURCE_REVISION_ID),
      evidenceStep: "reopenComplete",
    },
  });
  expect(assistedRetry.status()).toBe(409);
  const incorrectRetry = await context.request.post("/api/review-os/c3r-p", {
    data: {
      action: "complete_reopened_review",
      commandId: randomUUID(),
      recordId,
      expectedVersion: reopenedVersion,
      attemptId: randomUUID(),
      claim: practiceClaim(C3R_P_SOURCE_REVISION_ID, 90_000_000),
      planBlockId: null,
      evidenceStep: "reopenComplete",
    },
  });
  expect(incorrectRetry.status()).toBe(409);
  const staleRetry = await context.request.post("/api/review-os/c3r-p", {
    data: {
      action: "complete_reopened_review",
      commandId: randomUUID(),
      recordId,
      expectedVersion: reopenedVersion - 1,
      attemptId: randomUUID(),
      claim: practiceClaim(C3R_P_SOURCE_REVISION_ID),
      planBlockId: null,
      evidenceStep: "reopenComplete",
    },
  });
  expect(staleRetry.status()).toBe(409);
  const crossUserRetry = await contextB.request.post("/api/review-os/c3r-p", {
    data: {
      action: "complete_reopened_review",
      commandId: randomUUID(),
      recordId,
      expectedVersion: reopenedVersion,
      attemptId: randomUUID(),
      claim: practiceClaim(C3R_P_SOURCE_REVISION_ID),
      planBlockId: null,
      evidenceStep: "reopenComplete",
    },
  });
  expect(crossUserRetry.status()).toBe(404);
  const afterHostileRetries = await context.request.get(
    `/api/review-os/c3r-p?recordId=${recordId}`,
  );
  const afterHostileRetryBody = await afterHostileRetries.json();
  expect(afterHostileRetryBody.view.restored.record).toMatchObject({
    state: "REOPENED",
    record_version: reopenedVersion,
  });

  const createPlanRequestPromise = secondPage.waitForRequest((request) =>
    new URL(request.url()).pathname === "/api/review-os/c3r-p" &&
    request.method() === "POST" &&
    request.postDataJSON()?.action === "create_plan",
  );
  const createPlanResponsePromise = secondPage.waitForResponse((response) => {
    const request = response.request();
    return (
      new URL(response.url()).pathname === "/api/review-os/c3r-p" &&
      request.method() === "POST" &&
      request.postDataJSON()?.action === "create_plan"
    );
  });
  await secondPage.getByRole("button", { name: "Today 90분" }).click();
  const createPlanRequest = await createPlanRequestPromise;
  expect(createPlanRequest.postDataJSON()).toMatchObject({
    action: "create_plan",
    recordId,
    kind: "TODAY",
    availableMinutes: 90,
    evidenceStep: "planToday",
  });
  const createPlanResponse = await createPlanResponsePromise;
  const createPlanBody = await createPlanResponse.json();
  expect(
    createPlanResponse.status(),
    JSON.stringify({
      status: createPlanResponse.status(),
      error:
        createPlanBody && typeof createPlanBody.error === "string"
          ? createPlanBody.error
          : "none",
    }),
  ).toBe(200);
  expect(createPlanBody).toMatchObject({
    ok: true,
    view: {
      restored: {
        record: {
          id: recordId,
          state: "REOPENED",
        },
      },
      currentPlan: {
        planKind: "TODAY",
        state: "PROPOSED",
        recordVersion: 1,
      },
    },
  });
  expect(createPlanBody.view.currentPlan.blocks.length).toBeGreaterThan(0);
  expect(createPlanBody.view.currentPlan.blocks[0].executionState).toBe("PENDING");
  const todayPlanId = createPlanBody.view.currentPlan.planId;
  const initialTodayBlockId = createPlanBody.view.currentPlan.blocks[0].blockId;
  expect(createPlanBody.view.dashboard.plans).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        planId: createPlanBody.view.currentPlan.planId,
        state: "PROPOSED",
        recordVersion: 1,
      }),
    ]),
  );
  await expect(secondPage.getByText("계획 상태: PROPOSED")).toBeVisible();
  await expect(secondPage.getByText("dayComplete: false")).toBeVisible();
  const editPlanResponsePromise = secondPage.waitForResponse((response) => {
    const request = response.request();
    return (
      new URL(response.url()).pathname === "/api/review-os/c3r-p" &&
      request.method() === "POST" &&
      request.postDataJSON()?.action === "decide_plan"
    );
  });
  await secondPage.getByRole("button", { name: "편집" }).click();
  const editPlanResponse = await editPlanResponsePromise;
  expect(editPlanResponse.status()).toBe(200);
  const editPlanBody = await editPlanResponse.json();
  expect(editPlanBody).toMatchObject({
    ok: true,
    view: {
      restored: {
        record: {
          id: recordId,
          state: "REOPENED",
        },
      },
      currentPlan: {
        planId: createPlanBody.view.currentPlan.planId,
        state: "EDITED",
        recordVersion: 2,
      },
    },
  });
  const editedTodayBlock = editPlanBody.view.currentPlan.blocks[0];
  expect(editedTodayBlock).toMatchObject({
    minutes: 25,
    executionState: "PENDING",
  });
  expect(editedTodayBlock.blockId).not.toBe(initialTodayBlockId);
  await expect(secondPage.getByText("계획 상태: EDITED")).toBeVisible();

  const fullDayResponsePromise = secondPage.waitForResponse((response) =>
    response.request().postDataJSON()?.action === "create_plan",
  );
  await secondPage.getByRole("button", { name: "Full-Day 240분" }).click();
  const fullDayResponse = await fullDayResponsePromise;
  expect(fullDayResponse.status()).toBe(200);
  const fullDayBody = await fullDayResponse.json();
  expect(fullDayBody.view.currentPlan).toMatchObject({
    planKind: "FULL_DAY",
    state: "PROPOSED",
  });
  const staleFullDayPlanId = fullDayBody.view.currentPlan.planId;
  const staleFullDayBlockId = fullDayBody.view.currentPlan.blocks[0].blockId;
  const acceptPlanResponsePromise = secondPage.waitForResponse((response) =>
    response.request().postDataJSON()?.action === "decide_plan",
  );
  await secondPage.getByRole("button", { name: "수락" }).click();
  const acceptPlanResponse = await acceptPlanResponsePromise;
  expect(acceptPlanResponse.status()).toBe(200);
  const acceptedPlan = await acceptPlanResponse.json();
  expect(acceptedPlan.view.currentPlan).toMatchObject({
    planId: staleFullDayPlanId,
    state: "ACCEPTED",
    blocks: [expect.objectContaining({
      blockId: staleFullDayBlockId,
      executionState: "PENDING",
    })],
  });

  const missingCurrentBlock = await context.request.post(
    "/api/review-os/c3r-p",
    { data: {
      action: "complete_reopened_review",
      commandId: randomUUID(),
      recordId,
      expectedVersion: reopenedVersion,
      attemptId: randomUUID(),
      claim: practiceClaim(C3R_P_SOURCE_REVISION_ID),
      planBlockId: null,
      planId: staleFullDayPlanId,
      planVersion: acceptedPlan.view.currentPlan.recordVersion,
      evidenceStep: "reopenComplete",
    } },
  );
  expect(missingCurrentBlock.status()).toBe(409);
  const stalePlanVersion = await context.request.post(
    "/api/review-os/c3r-p",
    { data: {
      action: "complete_reopened_review",
      commandId: randomUUID(),
      recordId,
      expectedVersion: reopenedVersion,
      attemptId: randomUUID(),
      claim: practiceClaim(C3R_P_SOURCE_REVISION_ID),
      planBlockId: staleFullDayBlockId,
      planId: staleFullDayPlanId,
      planVersion: acceptedPlan.view.currentPlan.recordVersion - 1,
      evidenceStep: "reopenComplete",
    } },
  );
  expect(stalePlanVersion.status()).toBe(409);
  const wrongPlanBinding = await context.request.post(
    "/api/review-os/c3r-p",
    { data: {
      action: "complete_reopened_review",
      commandId: randomUUID(),
      recordId,
      expectedVersion: reopenedVersion,
      attemptId: randomUUID(),
      claim: practiceClaim(C3R_P_SOURCE_REVISION_ID),
      planBlockId: randomUUID(),
      planId: randomUUID(),
      planVersion: 1,
      evidenceStep: "reopenComplete",
    } },
  );
  expect(wrongPlanBinding.status()).toBe(409);
  const ambiguousEdit = await context.request.post(
    "/api/review-os/c3r-p",
    { data: {
      action: "decide_plan",
      commandId: randomUUID(),
      recordId,
      planId: staleFullDayPlanId,
      expectedVersion: acceptedPlan.view.currentPlan.recordVersion,
      decision: "EDIT",
      blocks: [1, 2].map((ordinal) => ({
        blockId: randomUUID(),
        blockKind: "CORE_OUTCOME",
        recordId,
        gapId,
        reviewPhase: "REOPENED_REVIEW",
        ordinal,
        minutes: 30,
      })),
      evidenceStep: "reopenComplete",
    } },
  );
  expect(ambiguousEdit.status()).toBe(409);

  const replacementFullDayPlan = await createAcceptedPlan(
    context,
    recordId,
    "FULL_DAY",
    "reopenComplete",
  );
  const fullDayPlanId = replacementFullDayPlan.planId;
  const fullDayBlock = replacementFullDayPlan.blocks.find(
    (block: { recordId: string }) => block.recordId === recordId,
  );
  expect(fullDayBlock).toBeTruthy();
  const fullDayBlockId = fullDayBlock!.blockId;
  await secondPage.reload();
  await expect(secondPage.getByText("계획 상태: ACCEPTED")).toBeVisible();

  await fillStructuredCalculation(secondPage);
  const completionRequestPromise = secondPage.waitForRequest((request) =>
    request.postDataJSON()?.action === "complete_reopened_review",
  );
  const completionResponsePromise = secondPage.waitForResponse((response) =>
    response.request().postDataJSON()?.action === "complete_reopened_review",
  );
  await secondPage.getByRole("button", {
    name: "다시 열린 복습을 독립 수행으로 완료",
  }).click();
  const completionRequest = await completionRequestPromise;
  const completionPayload = completionRequest.postDataJSON();
  expect(completionPayload).toMatchObject({
    action: "complete_reopened_review",
    recordId,
    expectedVersion: reopenedVersion,
    planBlockId: fullDayBlockId,
    evidenceStep: "reopenComplete",
  });
  const completionAttemptId = completionPayload.attemptId;
  const completionResponse = await completionResponsePromise;
  expect(completionResponse.status()).toBe(200);
  const completionBody = await completionResponse.json();
  expect(completionBody.view.restored.record.state).toBe("CLOSED");
  expect(completionBody.view.restored.gaps[0].state).toBe("CLOSED");
  expect(completionBody.view.dashboard.queue).not.toEqual(expect.arrayContaining([
    expect.objectContaining({ recordId }),
  ]));
  expect(completionBody.view.currentPlan).toMatchObject({
    planId: fullDayPlanId,
    dayComplete: true,
    blocks: [expect.objectContaining({
      blockId: fullDayBlockId,
      executionState: "COMPLETE",
    })],
  });
  expect(completionBody.view.dashboard.plans).toEqual(expect.arrayContaining([
    expect.objectContaining({
      planId: staleFullDayPlanId,
      blocks: [expect.objectContaining({
        blockId: staleFullDayBlockId,
        executionState: "PENDING",
      })],
    }),
  ]));
  await expectState(secondPage, "CLOSED");
  await expect(secondPage.getByTestId("c3r-p-queue-count")).toHaveText(
    "실행 가능한 Review Queue: 0개",
  );
  await expect(secondPage.getByText(/CORE_OUTCOME · REOPENED_REVIEW · 30분 · COMPLETE/u)).toBeVisible();
  await expect(secondPage.getByText("dayComplete: true")).toBeVisible();

  const duplicateCompletion = await context.request.post(
    "/api/review-os/c3r-p",
    { data: completionPayload },
  );
  expect(duplicateCompletion.status()).toBe(200);
  expect((await duplicateCompletion.json()).view.restored.record.state).toBe("CLOSED");

  await secondPage.reload();
  await expectState(secondPage, "CLOSED");
  await expect(secondPage.getByTestId("c3r-p-ledger")).toContainText(
    "REOPENED_COMPLETED",
  );
  await expect(secondPage.getByText(/CORE_OUTCOME · REOPENED_REVIEW · 30분 · COMPLETE/u)).toBeVisible();
  await fillStructuredCalculation(secondPage, "90000000");
  await secondPage
    .getByRole("button", { name: "입력한 후속 실패로 간극 다시 열기" })
    .click();
  await expectState(secondPage, "REOPENED");
  const reopenedAgainResponse = await context.request.get(
    `/api/review-os/c3r-p?recordId=${recordId}`,
  );
  const reopenedAgain = await reopenedAgainResponse.json();
  expect(reopenedAgain.view.restored.gaps[0]).toMatchObject({
    state: "REOPENED",
    reopen_count: 2,
  });
  expect(reopenedAgain.view.currentPlan.blocks).toEqual(expect.arrayContaining([
    expect.objectContaining({
      blockId: fullDayBlockId,
      executionState: "COMPLETE",
    }),
  ]));
  const completedBlockReuse = await context.request.post(
    "/api/review-os/c3r-p",
    {
      data: {
        action: "complete_reopened_review",
        commandId: randomUUID(),
        recordId,
        expectedVersion: reopenedAgain.view.restored.record.record_version,
        attemptId: randomUUID(),
        claim: practiceClaim(C3R_P_SOURCE_REVISION_ID),
        planBlockId: fullDayBlockId,
        evidenceStep: "reopenComplete",
      },
    },
  );
  expect(completedBlockReuse.status()).toBe(409);
  const afterCompletedBlockReuse = await context.request.get(
    `/api/review-os/c3r-p?recordId=${recordId}`,
  );
  expect((await afterCompletedBlockReuse.json()).view.restored.record).toMatchObject({
    state: "REOPENED",
    record_version: reopenedAgain.view.restored.record.record_version,
  });

  let retryWithoutCompletedBlock: Record<string, unknown> | null = null;
  const rejectFinalRetry = async (route: Route) => {
    const payload = route.request().postDataJSON();
    if (payload?.action === "complete_reopened_review") {
      retryWithoutCompletedBlock = payload;
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "invalid_transition" }),
      });
      return;
    }
    await route.continue();
  };
  await secondPage.route("**/api/review-os/c3r-p", rejectFinalRetry);
  await fillStructuredCalculation(secondPage);
  await secondPage.getByRole("button", {
    name: "다시 열린 복습을 독립 수행으로 완료",
  }).click();
  await expect.poll(() => retryWithoutCompletedBlock).not.toBeNull();
  expect(retryWithoutCompletedBlock).toMatchObject({
    action: "complete_reopened_review",
    planBlockId: null,
  });
  await expect(
    secondPage.getByRole("alert").filter({ hasText: "invalid_transition" }),
  ).toContainText("invalid_transition");
  await secondPage.unroute("**/api/review-os/c3r-p", rejectFinalRetry);
  await expectState(secondPage, "REOPENED");
  await contextB.close();
  expect(foreignHosts.size).toBe(0);
  await secondBrowser.close();
  await context.close();

  writeFileSync(
    evidencePath,
    `${JSON.stringify({
      recordId,
      gapId,
      foreignRecordId,
      foreignAssistanceEventId,
      todayPlanId,
      initialTodayBlockId,
      editedTodayBlockId: editedTodayBlock.blockId,
      staleFullDayPlanId,
      staleFullDayBlockId,
      fullDayPlanId,
      fullDayBlockId,
      staleD1PlanId: staleD1Plan.planId,
      staleD1PlanBlockId: staleD1Plan.blocks[0].blockId,
      d1PlanId: d1Plan.planId,
      d1PlanBlockId: d1Plan.blocks[0].blockId,
      d7PlanId: d7Plan.planId,
      d7PlanBlockId: d7Plan.blocks[0].blockId,
      recurrencePlanId: recurrencePlan.planId,
      recurrencePlanBlockId: recurrencePlan.blocks[0].blockId,
      transferTaskId,
      transferItemId,
      transferSurfaceId,
      completionAttemptId,
      browserToPostgres: true,
      secondBrowserRestore: true,
      assistedNotIndependent: true,
      assistedD1AttemptPersisted: true,
      assistedD1AssistanceEventPersisted: true,
      assistedD1LedgerPersisted: true,
      assistedD1RestoredAfterRefresh: true,
      assistedD1PrematureDenied: true,
      baseRouteRestoredExistingRecord: true,
      terminalPlanDoesNotReviveSuperseded: true,
      priorActivePlanSuperseded: true,
      d1Unaided: true,
      d7DifferentItemAndSurface: true,
      sealedTransferTaskPersisted: true,
      delayedD7ControlGated: true,
      d7PreDueInteractionSuppressed: true,
      d7CanonicalEligibilityAtDue: true,
      recurrenceControlGated: true,
      recurrencePreDueInteractionSuppressed: true,
      recurrenceCanonicalEligibilityAtDue: true,
      eligibilityRefreshAndSecondBrowser: true,
      foreignQueueCannotEnable: true,
      staleTerminalQueueCannotEnable: true,
      earlyDelayedCommandsFailClosed: true,
      transferTaskPresentedBeforeSubmission: true,
      originalTaskReuseDenied: true,
      originalAnchorVersionReuseDenied: true,
      fabricatedTransferTaskDenied: true,
      transferTaskRestoredAfterRefresh: true,
      transferTaskExportedMetadataOnly: true,
      timedRecurrence: true,
      laterFailureReopen: true,
      reopenedCompletion: true,
      planBlockCompletion: true,
      everyReviewPhasePlanBlockCompleted: true,
      missingCurrentPlanBlockDenied: true,
      stalePlanVersionDenied: true,
      wrongPlanBindingDenied: true,
      ambiguousPlanBlocksDenied: true,
      staleReviewStateDigestDenied: true,
      unrelatedPlanBlockPreserved: true,
      dayCompleteRecomputedHonestly: true,
      planlessCompletionAllowedWithoutActivePlan: true,
      completeLearnerExport: true,
      assistedRetryDenied: true,
      incorrectRetryDenied: true,
      staleRetryDenied: true,
      duplicateRetryIdempotent: true,
      crossUserRetryDenied: true,
      unrelatedPlanBlockUnchanged: true,
      laterFailureReopensAgain: true,
      completedPlanBlockReuseDenied: true,
      completedPlanBlockNotResent: true,
      deterministicPlanner: true,
      stateMachineMatrixPairs: 112,
      stateMachineMatrixResult: "passed",
      providerCalls: 0,
    })}\n`,
    "utf8",
  );
});
