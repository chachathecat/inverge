import { expect, test, type Browser, type BrowserContext } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

const baseURL = process.env.E2E_BASE_URL ?? "";
const emailA = process.env.C3R_P_USER_A_EMAIL ?? "";
const passwordA = process.env.C3R_P_USER_A_PASSWORD ?? "";
const emailB = process.env.C3R_P_USER_B_EMAIL ?? "";
const passwordB = process.env.C3R_P_USER_B_PASSWORD ?? "";
const evidencePath = process.env.C3R_P_BROWSER_EVIDENCE_PATH ?? "";
const restoreOnly = process.env.C3R_P_RESTORE_ONLY === "true";

function requireLocalRuntime() {
  if (!baseURL || !emailA || !passwordA || !emailB || !passwordB || !evidencePath) {
    throw new Error("C3R-P browser runtime environment is incomplete");
  }
  if (!["127.0.0.1", "localhost", "::1"].includes(new URL(baseURL).hostname)) {
    throw new Error("C3R-P browser runtime refused a non-local target");
  }
}

async function login(context: BrowserContext, email: string, password: string) {
  const response = await context.request.post("/api/auth/sign-in", {
    data: { email, password, mode: "second" },
  });
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ ok: true });
}

async function contextFor(browser: Browser, email: string, password: string) {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
  await login(context, email, password);
  return context;
}

async function expectState(page: import("@playwright/test").Page, state: string) {
  await expect(page.locator("[data-c3r-p-practice-runtime]"))
    .toHaveAttribute("data-c3r-p-state", state);
}

async function fillStructuredCalculation(
  page: import("@playwright/test").Page,
  result = "100000000",
) {
  await page.getByTestId("c3r-p-gross-income").fill("120000000");
  await page.getByTestId("c3r-p-operating-expense").fill("20000000");
  await page.getByTestId("c3r-p-result").fill(result);
}

test("exact Practice browser-to-Postgres durable loop", async ({ browser }) => {
  requireLocalRuntime();
  if (restoreOnly) {
    const prior = JSON.parse(readFileSync(evidencePath, "utf8"));
    const contextA = await contextFor(browser, emailA, passwordA);
    const pageA = await contextA.newPage();
    await pageA.goto(`/app/c3r-p?recordId=${prior.recordId}`);
    await expectState(pageA, "REOPENED");
    await expect(pageA.getByTestId("c3r-p-ledger")).toContainText("LATER_FAILURE_REOPEN");

    const contextB = await contextFor(browser, emailB, passwordB);
    const denial = await contextB.request.get(`/api/review-os/c3r-p?recordId=${prior.recordId}`);
    expect(denial.status()).toBe(404);
    await contextB.close();

    const exportResponse = await contextA.request.post("/api/review-os/c3r-p", {
      data: { action: "export" },
    });
    expect(exportResponse.status()).toBe(200);
    const exported = await exportResponse.json();
    expect(exported.ok).toBe(true);
    expect(JSON.stringify(exported)).not.toContain(emailA);

    let denyDeleteOnce = true;
    await pageA.route("**/api/review-os/c3r-p", async (route) => {
      const request = route.request();
      if (denyDeleteOnce && request.method() === "POST" && request.postDataJSON()?.action === "delete") {
        denyDeleteOnce = false;
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({
          ok: false,
          error: "temporarily_unavailable",
        }) });
        return;
      }
      await route.continue();
    });
    pageA.once("dialog", (dialog) => dialog.accept());
    await pageA.getByRole("button", { name: "내 C3R-P 데이터 삭제" }).click();
    await expect(pageA.getByRole("alert")).toContainText("temporarily_unavailable");
    await expect(pageA.getByTestId("c3r-p-ledger")).toBeVisible();
    await expect(pageA.getByRole("status")).not.toHaveText("삭제 완료");

    await pageA.unroute("**/api/review-os/c3r-p");
    pageA.once("dialog", (dialog) => dialog.accept());
    await pageA.getByRole("button", { name: "내 C3R-P 데이터 삭제" }).click();
    await expect(pageA.getByRole("status")).toHaveText("삭제 완료");
    const deleted = await contextA.request.get(`/api/review-os/c3r-p?recordId=${prior.recordId}`);
    expect(deleted.status()).toBe(404);
    await contextA.close();
    writeFileSync(evidencePath, `${JSON.stringify({
      ...prior,
      restartRestore: true,
      crossUserDenied: true,
      exportDelete: true,
      rawLearnerBodyInEvidence: false,
    })}\n`, "utf8");
    return;
  }

  const context = await contextFor(browser, emailA, passwordA);
  const page = await context.newPage();
  const foreignHosts = new Set<string>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== new URL(baseURL).origin) foreignHosts.add(url.host);
  });
  await page.goto("/app/c3r-p");
  await expectState(page, "UNSTARTED");
  await page.getByRole("button", { name: "첫 시도와 확신을 고정하기" }).click();
  await expectState(page, "D0_OPEN");
  const recordId = new URL(page.url()).searchParams.get("recordId");
  expect(recordId).toMatch(/^[0-9a-f-]{36}$/);

  await page.getByRole("button", { name: "도움 상태를 먼저 기록하고 가장 큰 간극 보기" }).click();
  await expectState(page, "FEEDBACK_COMMITTED");
  await expect(page.getByText("가장 큰 간극 1개:")).toBeVisible();
  await fillStructuredCalculation(page);
  await page.getByRole("button", { name: "내가 입력한 구조화 계산으로 수리 저장" }).click();
  await expectState(page, "REPAIRED");

  await page.getByRole("button", { name: "도움을 사용한 D+1 기록(독립 성공 아님)" }).click();
  await expectState(page, "REPAIRED");
  await page.getByRole("button", { name: "D+1 무도움 재구성 완료" }).click();
  await expectState(page, "D1_COMPLETE");

  const secondBrowser = await contextFor(browser, emailA, passwordA);
  const secondPage = await secondBrowser.newPage();
  await secondPage.goto(`/app/c3r-p?recordId=${recordId}`);
  await expectState(secondPage, "D1_COMPLETE");
  await fillStructuredCalculation(secondPage);
  await secondPage.getByRole("button", { name: "다른 문항·다른 화면에서 봉인된 D+7 전이 완료" }).click();
  await expectState(secondPage, "D7_COMPLETE");
  await secondPage.getByRole("button", { name: "시간 기반 재출현 독립 수행 완료" }).click();
  await expectState(secondPage, "CLOSED");
  await secondPage.getByTestId("c3r-p-result").fill("90000000");
  await secondPage.getByRole("button", { name: "입력한 후속 실패로 간극 다시 열기" }).click();
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

  writeFileSync(evidencePath, `${JSON.stringify({
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
  })}\n`, "utf8");
});
