import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

const baseURL = process.env.E2E_BASE_URL ?? "";
const emailA = process.env.WCV_C2_USER_A_EMAIL ?? "";
const passwordA = process.env.WCV_C2_USER_A_PASSWORD ?? "";
const emailB = process.env.WCV_C2_USER_B_EMAIL ?? "";
const passwordB = process.env.WCV_C2_USER_B_PASSWORD ?? "";
const evidencePath = process.env.WCV_C2_BROWSER_EVIDENCE_PATH ?? "";
const recoverySessionId = process.env.WCV_C2_RECOVERY_SESSION_ID ?? "";

const inputModes = [
  "TYPED_TEXT",
  "EDITABLE_PHOTO_OCR",
  "EDITABLE_PDF_OCR",
  "EDITABLE_VOICE_TRANSCRIPTION",
  "STRUCTURED_SELECTION",
] as const;

const validRelation =
  "연간 총수익은 120,000,000원/년이고 연간 운영비는 20,000,000원/년이다. 120,000,000 - 20,000,000 = 100,000,000원/년. 연간 순수익은 100,000,000원/년으로 양수이며 반올림 없음.";
const disconnectedRelation =
  "연간 총수익 120,000,000원, 연간 운영비 20,000,000원, 연간 순수익 100,000,000원이며 반올림 없음.";

function requireRuntime() {
  if (!baseURL || !emailA || !passwordA || !emailB || !passwordB) {
    throw new Error("c2r-c-p browser runtime environment is incomplete");
  }
  const host = new URL(baseURL).hostname;
  if (!new Set(["127.0.0.1", "localhost", "::1"]).has(host)) {
    throw new Error("c2r-c-p browser runtime refused a non-local target");
  }
}

async function login(context: BrowserContext, email: string, password: string) {
  const response = await context.request.post("/api/auth/sign-in", {
    data: { email, password, mode: "second" },
  });
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ ok: true });
}

async function contextFor(
  browser: Browser,
  email = emailA,
  password = passwordA,
  viewport = { width: 390, height: 844 },
) {
  const context = await browser.newContext({ baseURL, viewport });
  await login(context, email, password);
  return context;
}

function monitorProviderBoundary(page: Page) {
  const foreignHosts = new Set<string>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== new URL(baseURL).origin) foreignHosts.add(url.host);
  });
  return foreignHosts;
}

async function expectState(page: Page, state: string) {
  await expect(page.locator("[data-trusted-repair-state]")).toHaveAttribute(
    "data-trusted-repair-state",
    state,
  );
}

async function assertA11yAndPrimary(page: Page) {
  await expect(page.locator("[data-primary-action]:visible")).toHaveCount(1);
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(
      (item) => item.impact === "serious" || item.impact === "critical",
    ),
  ).toEqual([]);
}

async function activatePrimary(page: Page, keyboardOnly = false) {
  const button = page.locator("[data-primary-action]");
  if (keyboardOnly) {
    await button.focus();
    await page.keyboard.press("Enter");
  } else {
    await button.click();
  }
}

async function fillText(
  page: Page,
  label: string,
  value: string,
  keyboardOnly = false,
) {
  const control = page.getByLabel(label);
  await control.focus();
  if (keyboardOnly) {
    await page.keyboard.press("Control+A");
    await page.keyboard.insertText(value);
  } else {
    await control.fill(value);
  }
}

async function completePracticeJourney(input: {
  browser: Browser;
  viewport: { width: number; height: number };
  keyboardOnly?: boolean;
  resumeInNewBrowser?: boolean;
  zoomTwoHundredPercent?: boolean;
}) {
  let context = await contextFor(
    input.browser,
    emailA,
    passwordA,
    input.viewport,
  );
  let page = await context.newPage();
  let providerHosts = monitorProviderBoundary(page);
  const startedAt = Date.now();
  await page.goto("/app/trusted-repair");
  await expectState(page, "start");
  await expect(page.getByLabel("과목")).toHaveValue("appraisal_practical");
  await expect(page.getByLabel("과목").locator("option")).toHaveCount(1);
  await assertA11yAndPrimary(page);

  await activatePrimary(page, input.keyboardOnly);
  await expectState(page, "editable_capture_draft");
  await activatePrimary(page, input.keyboardOnly);
  await expectState(page, "revision_confirmed");
  await activatePrimary(page, input.keyboardOnly);
  await expectState(page, "prediction_committed");
  await fillText(page, "도움 전 독립 시도", disconnectedRelation, input.keyboardOnly);
  await activatePrimary(page, input.keyboardOnly);
  await expectState(page, "independent_attempt_committed");
  await activatePrimary(page, input.keyboardOnly);
  await expectState(page, "self_diagnosis_committed");
  await activatePrimary(page, input.keyboardOnly);
  await expectState(page, "diagnosed");
  await expect(page.getByLabel("계산관계 검증 상태")).toContainText(
    "UNSUPPORTED",
  );
  await expect(page.getByLabel("커밋된 최소 도움")).toHaveCount(0);

  if (input.zoomTwoHundredPercent) {
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth + 1,
        ),
      )
      .toBe(true);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
    });
  }

  await activatePrimary(page, input.keyboardOnly);
  await expectState(page, "exposure_committed");
  await expect(page.getByLabel("커밋된 최소 도움")).toBeVisible();

  if (input.resumeInNewBrowser) {
    const durableUrl = page.url();
    expect([...providerHosts]).toEqual([]);
    await context.close();
    context = await contextFor(
      input.browser,
      emailA,
      passwordA,
      input.viewport,
    );
    page = await context.newPage();
    providerHosts = monitorProviderBoundary(page);
    await page.goto(durableUrl);
    await expectState(page, "exposure_committed");
    await expect(page.getByLabel("커밋된 최소 도움")).toBeVisible();
  }

  await fillText(page, "복구 답안", validRelation, input.keyboardOnly);
  await activatePrimary(page, input.keyboardOnly);
  await expectState(page, "repair_submitted");
  await activatePrimary(page, input.keyboardOnly);
  await expectState(page, "verified");
  await expect(page.getByLabel("계산관계 검증 상태")).toContainText("PASS");
  await assertA11yAndPrimary(page);
  expect([...providerHosts]).toEqual([]);
  const durationMs = Date.now() - startedAt;
  expect(durationMs).toBeLessThan(300_000);
  await context.close();
  return durationMs;
}

async function apiCommand(
  context: BrowserContext,
  action: string,
  fields: Record<string, unknown>,
  commandId = randomUUID(),
) {
  const response = await context.request.post(
    "/api/review-os/trusted-repair",
    { data: { action, commandId, ...fields } },
  );
  return { response, body: await response.json(), commandId };
}

async function createPartialPractice(context: BrowserContext) {
  let view = (
    await apiCommand(context, "start", {
      subject: "appraisal_practical",
      inputMode: "TYPED_TEXT",
    })
  ).body.view;
  for (const [action, fields] of [
    ["confirm_revision", { body: "합성 확정 수정본" }],
    ["commit_prediction", { prediction: "likely_partial", confidence: "medium" }],
    ["commit_attempt", { body: disconnectedRelation }],
    ["commit_self_diagnosis", { selfDiagnosisCode: "unit_or_definition_drift" }],
    ["diagnose", {}],
    ["request_scaffold", {}],
    ["submit_repair", { body: disconnectedRelation }],
    ["continue", { continuation: "VERIFY_AND_CONTINUE" }],
  ] as const) {
    const result = await apiCommand(context, action, {
      sessionId: view.session.sessionId,
      expectedVersion: view.session.recordVersion,
      ...fields,
    });
    expect(result.response.status()).toBe(200);
    view = result.body.view;
  }
  expect(view.session.state).toBe("partial");
  expect(view.session.proofEvaluation.state).toBe("UNSUPPORTED");
  expect(view.session.immediatePartialRetryAvailable).toBe(true);
  return view;
}

test("Practice-only browser to Postgres journey, hostile concurrency, bounded retry, and tenant isolation", async ({ browser }) => {
  requireRuntime();
  test.skip(Boolean(recoverySessionId), "normal pass is omitted during restart recovery");

  const timings = [
    await completePracticeJourney({
      browser,
      viewport: { width: 390, height: 844 },
      keyboardOnly: true,
      resumeInNewBrowser: true,
      zoomTwoHundredPercent: true,
    }),
    await completePracticeJourney({ browser, viewport: { width: 768, height: 900 } }),
    await completePracticeJourney({ browser, viewport: { width: 1440, height: 900 } }),
  ];

  const owner = await contextFor(browser);
  const modePage = await owner.newPage();
  for (const mode of inputModes) {
    await modePage.goto("/app/trusted-repair");
    await modePage.getByLabel("편집 가능한 입력").selectOption(mode);
    await activatePrimary(modePage);
    await expectState(modePage, "editable_capture_draft");
    await expect(modePage.getByLabel("편집 가능한 캡처 초안")).not.toHaveValue("");
  }

  const forged = await owner.request.post("/api/review-os/trusted-repair", {
    data: {
      action: "start",
      subject: "appraisal_practical",
      inputMode: "TYPED_TEXT",
      commandId: randomUUID(),
      forgedState: "verified",
    },
  });
  expect(forged.status()).toBe(400);
  const crossSubject = await apiCommand(owner, "start", {
    subject: "appraisal_theory",
    inputMode: "TYPED_TEXT",
  });
  expect(crossSubject.response.status()).toBe(400);

  const started = await apiCommand(owner, "start", {
    subject: "appraisal_practical",
    inputMode: "TYPED_TEXT",
  });
  const confirmId = randomUUID();
  const confirmed = await apiCommand(
    owner,
    "confirm_revision",
    {
      sessionId: started.body.view.session.sessionId,
      expectedVersion: started.body.view.session.recordVersion,
      body: "합성 확정 수정본",
    },
    confirmId,
  );
  expect(confirmed.response.status()).toBe(200);
  const replayed = await apiCommand(
    owner,
    "confirm_revision",
    {
      sessionId: started.body.view.session.sessionId,
      expectedVersion: started.body.view.session.recordVersion,
      body: "재전송 본문은 기존 결과를 바꾸지 않는다",
    },
    confirmId,
  );
  expect(replayed.body.view.session.recordVersion).toBe(
    confirmed.body.view.session.recordVersion,
  );

  const duplicateStarted = await apiCommand(owner, "start", {
    subject: "appraisal_practical",
    inputMode: "TYPED_TEXT",
  });
  const duplicateCommandId = randomUUID();
  const duplicateFields = {
    sessionId: duplicateStarted.body.view.session.sessionId,
    expectedVersion: duplicateStarted.body.view.session.recordVersion,
    body: "동시 재전송 합성 확정 수정본",
  };
  const duplicateRace = await Promise.all([
    apiCommand(
      owner,
      "confirm_revision",
      duplicateFields,
      duplicateCommandId,
    ),
    apiCommand(
      owner,
      "confirm_revision",
      duplicateFields,
      duplicateCommandId,
    ),
  ]);
  expect(duplicateRace.map((item) => item.response.status()).sort()).toEqual([
    200,
    200,
  ]);
  expect(duplicateRace[0].body.view.session.recordVersion).toBe(
    duplicateRace[1].body.view.session.recordVersion,
  );

  const raceFields = {
    sessionId: started.body.view.session.sessionId,
    expectedVersion: confirmed.body.view.session.recordVersion,
    prediction: "likely_partial",
    confidence: "medium",
  };
  const race = await Promise.all([
    apiCommand(owner, "commit_prediction", raceFields),
    apiCommand(owner, "commit_prediction", raceFields),
  ]);
  expect(race.map((item) => item.response.status()).sort()).toEqual([200, 409]);
  expect(race.find((item) => item.response.status() === 409)?.body).not.toHaveProperty("view");

  const ownerGet = await owner.request.get(
    `/api/review-os/trusted-repair?sessionId=${started.body.view.session.sessionId}`,
    { headers: { Purpose: "prefetch" } },
  );
  expect(ownerGet.status()).toBe(200);
  expect(ownerGet.headers()["cache-control"]).toContain("no-store");
  expect(ownerGet.headers().vary).toContain("Cookie");

  const corrected = await createPartialPractice(owner);
  const correctedRetry = await apiCommand(owner, "submit_repair", {
    sessionId: corrected.session.sessionId,
    expectedVersion: corrected.session.recordVersion,
    body: validRelation,
  });
  expect(correctedRetry.response.status()).toBe(200);
  const correctedVerification = await apiCommand(owner, "continue", {
    sessionId: correctedRetry.body.view.session.sessionId,
    expectedVersion: correctedRetry.body.view.session.recordVersion,
    continuation: "VERIFY_AND_CONTINUE",
  });
  expect(correctedVerification.body.view.session.state).toBe("verified");
  expect(correctedVerification.body.view.session.proofEvaluation.state).toBe("PASS");

  const exhausted = await createPartialPractice(owner);
  const failedRetry = await apiCommand(owner, "submit_repair", {
    sessionId: exhausted.session.sessionId,
    expectedVersion: exhausted.session.recordVersion,
    body: disconnectedRelation,
  });
  const failedVerification = await apiCommand(owner, "continue", {
    sessionId: failedRetry.body.view.session.sessionId,
    expectedVersion: failedRetry.body.view.session.recordVersion,
    continuation: "VERIFY_AND_CONTINUE",
  });
  expect(failedVerification.body.view.session.state).toBe("partial");
  expect(failedVerification.body.view.session.immediatePartialRetryAvailable).toBe(false);
  const thirdSubmission = await apiCommand(owner, "submit_repair", {
    sessionId: failedVerification.body.view.session.sessionId,
    expectedVersion: failedVerification.body.view.session.recordVersion,
    body: validRelation,
  });
  expect(thirdSubmission.response.status()).toBe(409);
  expect(thirdSubmission.body).not.toHaveProperty("view");

  const otherUser = await contextFor(browser, emailB, passwordB);
  const crossTenant = await otherUser.request.get(
    `/api/review-os/trusted-repair?sessionId=${started.body.view.session.sessionId}`,
  );
  expect(crossTenant.status()).toBe(404);
  await otherUser.close();
  await owner.close();

  timings.sort((left, right) => left - right);
  const evidence = {
    subjectRuns: [{
      subject: "appraisal_practical",
      result: "passed",
      durationMs: timings[1],
    }],
    medianDurationMs: timings[1],
    responsiveWidths: [390, 768, 1440],
    inputModes: [...inputModes],
    axeSeriousCritical: 0,
    keyboardOnly: "passed",
    newBrowserRecovery: "passed",
    exactTypedRelationPass: "passed",
    disconnectedNumbersFailClosed: "passed",
    boundedPartialRetry: "passed",
    casAndIdempotency: "passed",
    providerNetworkRequests: 0,
  };
  if (evidencePath) {
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {
      mode: 0o600,
    });
  }
});

test("process restart recovers a bodyless Practice session", async ({ browser }) => {
  requireRuntime();
  test.skip(!recoverySessionId, "restart recovery runs only after the server is restarted");
  const context = await contextFor(browser);
  const page = await context.newPage();
  const providerHosts = monitorProviderBoundary(page);
  await page.goto(
    `/app/trusted-repair?sessionId=${encodeURIComponent(recoverySessionId)}`,
  );
  await expectState(page, "partial");
  await expect(page.locator("[data-primary-action]:visible")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /남은 기준 다시 쓰기|가이드로 전환/ })).toBeVisible();
  expect([...providerHosts]).toEqual([]);
  await context.close();
});
