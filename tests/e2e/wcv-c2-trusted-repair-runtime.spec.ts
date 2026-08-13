import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

const baseURL = process.env.E2E_BASE_URL ?? "";
const emailA = process.env.WCV_C2_USER_A_EMAIL ?? "";
const passwordA = process.env.WCV_C2_USER_A_PASSWORD ?? "";
const emailB = process.env.WCV_C2_USER_B_EMAIL ?? "";
const passwordB = process.env.WCV_C2_USER_B_PASSWORD ?? "";
const evidencePath = process.env.WCV_C2_BROWSER_EVIDENCE_PATH ?? "";
const recoverySessionId = process.env.WCV_C2_RECOVERY_SESSION_ID ?? "";

const subjects = [
  "appraisal_practical",
  "appraisal_theory",
  "appraisal_compensation_law",
] as const;
const inputModes = [
  "TYPED_TEXT",
  "EDITABLE_PHOTO_OCR",
  "EDITABLE_PDF_OCR",
  "EDITABLE_VOICE_TRANSCRIPTION",
  "STRUCTURED_SELECTION",
] as const;

const repairs = {
  appraisal_practical:
    "수량 100m²와 단위가격 2000000원을 곱해 200000000원을 얻는다. 원 단위 양수이며 퍼센트 단위가 아니고 음수가 아니다. 반올림 없음으로 쓰고 역산하여 검산한다.",
  appraisal_theory:
    "최유효이용은 합리적이고 가능한 이용이다. 법적·물리적·경제적 가능성을 사례와 반대 사실에 적용해 결론을 낸다.",
  appraisal_compensation_law:
    "공식 출처의 유효 버전을 검증하고 사실을 요건에 포섭한다. 출처 충돌이면 결론을 보류하고 검증한다.",
} as const;

function requireRuntime() {
  if (!baseURL || !emailA || !passwordA || !emailB || !passwordB) {
    throw new Error("wcv-c2 browser runtime environment is incomplete");
  }
  const host = new URL(baseURL).hostname;
  if (!new Set(["127.0.0.1", "localhost", "::1"]).has(host)) {
    throw new Error("wcv-c2 browser runtime refused a non-local target");
  }
}

async function login(context: BrowserContext, email: string, password: string) {
  const response = await context.request.post("/api/auth/sign-in", {
    data: { email, password, mode: "second" },
  });
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(payload).toMatchObject({ ok: true });
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

async function assertA11yAndPrimary(page: Page) {
  await expect(page.locator("[data-primary-action]:visible")).toHaveCount(1);
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((item) =>
    item.impact === "serious" || item.impact === "critical",
  );
  expect(blocking, blocking.map((item) => item.id).join(",")).toEqual([]);
}

async function activatePrimary(page: Page, keyboardOnly: boolean) {
  const button = page.locator("[data-primary-action]");
  if (keyboardOnly) {
    await button.focus();
    await page.keyboard.press("Enter");
  } else {
    await button.click();
  }
}

async function expectState(page: Page, state: string) {
  await expect(page.locator("[data-trusted-repair-state]")).toHaveAttribute(
    "data-trusted-repair-state",
    state,
  );
}

async function fillText(page: Page, label: string, value: string, keyboardOnly: boolean) {
  const control = page.getByLabel(label);
  await control.focus();
  if (keyboardOnly) {
    await page.keyboard.press("Control+A");
    await page.keyboard.insertText(value);
  } else {
    await control.fill(value);
  }
}

async function completeJourney(input: {
  browser: Browser;
  subject: (typeof subjects)[number];
  viewport: { width: number; height: number };
  keyboardOnly?: boolean;
  newBrowserResume?: boolean;
  testTwoHundredPercent?: boolean;
}) {
  let context = await contextFor(input.browser, emailA, passwordA, input.viewport);
  let page = await context.newPage();
  const foreignHosts = monitorProviderBoundary(page);
  await page.goto("/app/trusted-repair");
  await expectState(page, "start");
  await assertA11yAndPrimary(page);
  const startedAt = Date.now();

  if (input.keyboardOnly) {
    const subjectSelect = page.getByLabel("과목");
    await subjectSelect.focus();
    await page.keyboard.press("Home");
    const subjectIndex = subjects.indexOf(input.subject);
    for (let index = 0; index < subjectIndex; index += 1) {
      await page.keyboard.press("ArrowDown");
    }
  } else {
    await page.getByLabel("과목").selectOption(input.subject);
  }
  await activatePrimary(page, Boolean(input.keyboardOnly));
  await expectState(page, "editable_capture_draft");
  await assertA11yAndPrimary(page);

  await activatePrimary(page, Boolean(input.keyboardOnly));
  await expectState(page, "revision_confirmed");
  await assertA11yAndPrimary(page);
  await activatePrimary(page, Boolean(input.keyboardOnly));
  await expectState(page, "prediction_committed");
  await assertA11yAndPrimary(page);

  await fillText(
    page,
    "도움 전 독립 시도",
    "독립적으로 적은 근거가 있지만 핵심 기준 일부는 아직 빠져 있다.",
    Boolean(input.keyboardOnly),
  );
  await activatePrimary(page, Boolean(input.keyboardOnly));
  await expectState(page, "independent_attempt_committed");
  await assertA11yAndPrimary(page);
  await activatePrimary(page, Boolean(input.keyboardOnly));
  await expectState(page, "self_diagnosis_committed");
  await assertA11yAndPrimary(page);
  await activatePrimary(page, Boolean(input.keyboardOnly));
  await expectState(page, "diagnosed");
  await expect(page.getByLabel("커밋된 최소 도움")).toHaveCount(0);
  await assertA11yAndPrimary(page);

  if (input.testTwoHundredPercent) {
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))
      .toBe(true);
    await assertA11yAndPrimary(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
    });
  }

  await activatePrimary(page, Boolean(input.keyboardOnly));
  await expectState(page, "exposure_committed");
  await expect(page.getByLabel("커밋된 최소 도움")).toBeVisible();
  await assertA11yAndPrimary(page);

  if (input.newBrowserResume) {
    const durableUrl = page.url();
    await context.close();
    context = await contextFor(input.browser, emailA, passwordA, input.viewport);
    page = await context.newPage();
    const resumedForeignHosts = monitorProviderBoundary(page);
    await page.goto(durableUrl);
    await expectState(page, "exposure_committed");
    await expect(page.getByLabel("커밋된 최소 도움")).toBeVisible();
    expect([...resumedForeignHosts]).toEqual([]);
  }

  await fillText(page, "복구 답안", repairs[input.subject], Boolean(input.keyboardOnly));
  await activatePrimary(page, Boolean(input.keyboardOnly));
  await expectState(page, "repair_submitted");
  await assertA11yAndPrimary(page);
  await activatePrimary(page, Boolean(input.keyboardOnly));
  await expectState(
    page,
    input.subject === "appraisal_compensation_law" ? "blocked" : "verified",
  );
  await assertA11yAndPrimary(page);
  if (input.subject === "appraisal_compensation_law") {
    await expect(page.getByText("검증 완료로 표시하지 않았습니다", { exact: false })).toBeVisible();
  }
  const durationMs = Date.now() - startedAt;
  expect(durationMs).toBeLessThan(300_000);
  expect([...foreignHosts]).toEqual([]);
  await context.close();
  return durationMs;
}

async function apiCommand(
  context: BrowserContext,
  action: string,
  fields: Record<string, unknown>,
  commandId = randomUUID(),
) {
  const response = await context.request.post("/api/review-os/trusted-repair", {
    data: { action, commandId, ...fields },
  });
  const body = await response.json();
  return { response, body, commandId };
}

async function createFirstPartialTheory(context: BrowserContext) {
  let view = (
    await apiCommand(context, "start", {
      subject: "appraisal_theory",
      inputMode: "TYPED_TEXT",
    })
  ).body.view;
  for (const [action, fields] of [
    ["confirm_revision", { body: "합성 확정 수정본" }],
    ["commit_prediction", { prediction: "likely_partial", confidence: "medium" }],
    ["commit_attempt", { body: "법적·물리적·경제적 가능성을 사례와 반대 사실에 적용해 결론을 낸다." }],
    ["commit_self_diagnosis", { selfDiagnosisCode: "missing_definition" }],
    ["diagnose", {}],
    ["request_scaffold", {}],
    ["submit_repair", { body: "최유효이용은 합리적이지 않고 가능하지 않다" }],
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
  expect(view.session.repairSubmissionCount).toBe(1);
  expect(view.session.immediatePartialRetryAvailable).toBe(true);
  return view;
}

async function completeApiRepairCase(input: {
  context: BrowserContext;
  subject: (typeof subjects)[number];
  attemptBody: string;
  repairBody: string;
}) {
  let view = (
    await apiCommand(input.context, "start", {
      subject: input.subject,
      inputMode: "TYPED_TEXT",
    })
  ).body.view;
  let diagnosedView: typeof view | null = null;
  for (const [action, fields] of [
    ["confirm_revision", { body: "합성 확정 수정본" }],
    ["commit_prediction", { prediction: "likely_partial", confidence: "medium" }],
    ["commit_attempt", { body: input.attemptBody }],
    ["commit_self_diagnosis", { selfDiagnosisCode: "semantic_boundary_check" }],
    ["diagnose", {}],
    ["request_scaffold", {}],
    ["submit_repair", { body: input.repairBody }],
    ["continue", { continuation: "VERIFY_AND_CONTINUE" }],
  ] as const) {
    const result = await apiCommand(input.context, action, {
      sessionId: view.session.sessionId,
      expectedVersion: view.session.recordVersion,
      ...fields,
    });
    expect(result.response.status()).toBe(200);
    view = result.body.view;
    if (action === "diagnose") diagnosedView = structuredClone(view);
  }
  expect(diagnosedView).not.toBeNull();
  return { diagnosedView: diagnosedView!, finalView: view };
}

test("three subjects, responsive flow, keyboard, input modes, attacks, and new-browser recovery", async ({ browser }) => {
  requireRuntime();
  test.skip(Boolean(recoverySessionId), "normal pass is omitted during restart recovery");
  const timings: Record<string, number> = {};
  timings.appraisal_practical = await completeJourney({
    browser,
    subject: "appraisal_practical",
    viewport: { width: 390, height: 844 },
    newBrowserResume: true,
    testTwoHundredPercent: true,
  });
  timings.appraisal_theory = await completeJourney({
    browser,
    subject: "appraisal_theory",
    viewport: { width: 390, height: 844 },
    keyboardOnly: true,
  });
  timings.appraisal_compensation_law = await completeJourney({
    browser,
    subject: "appraisal_compensation_law",
    viewport: { width: 390, height: 844 },
  });
  await completeJourney({
    browser,
    subject: "appraisal_practical",
    viewport: { width: 768, height: 900 },
  });
  await completeJourney({
    browser,
    subject: "appraisal_practical",
    viewport: { width: 1440, height: 900 },
  });

  const modeContext = await contextFor(browser);
  const modePage = await modeContext.newPage();
  for (const mode of inputModes) {
    await modePage.goto("/app/trusted-repair");
    await modePage.getByLabel("편집 가능한 입력").selectOption(mode);
    await activatePrimary(modePage, false);
    await expectState(modePage, "editable_capture_draft");
    await expect(modePage.getByLabel("편집 가능한 캡처 초안")).not.toHaveValue("");
    await activatePrimary(modePage, false);
    await expectState(modePage, "revision_confirmed");
  }

  const extra = await modeContext.request.post("/api/review-os/trusted-repair", {
    data: {
      action: "start",
      subject: "appraisal_practical",
      inputMode: "TYPED_TEXT",
      commandId: randomUUID(),
      forgedState: "verified",
    },
  });
  expect(extra.status()).toBe(400);

  const started = await apiCommand(modeContext, "start", {
    subject: "appraisal_practical",
    inputMode: "TYPED_TEXT",
  });
  expect(started.response.status()).toBe(200);
  const startView = started.body.view;
  const confirmId = randomUUID();
  const confirmed = await apiCommand(modeContext, "confirm_revision", {
    sessionId: startView.session.sessionId,
    expectedVersion: startView.session.recordVersion,
    body: "합성 확정 수정본",
  }, confirmId);
  expect(confirmed.response.status()).toBe(200);
  const replay = await apiCommand(modeContext, "confirm_revision", {
    sessionId: startView.session.sessionId,
    expectedVersion: startView.session.recordVersion,
    body: "다른 재전송 본문",
  }, confirmId);
  expect(replay.response.status()).toBe(200);
  expect(replay.body.view.session.recordVersion).toBe(confirmed.body.view.session.recordVersion);

  const version = confirmed.body.view.session.recordVersion;
  const raceFields = {
    sessionId: startView.session.sessionId,
    expectedVersion: version,
    prediction: "likely_partial",
    confidence: "medium",
  };
  const race = await Promise.all([
    apiCommand(modeContext, "commit_prediction", raceFields),
    apiCommand(modeContext, "commit_prediction", raceFields),
  ]);
  expect(race.map((item) => item.response.status()).sort()).toEqual([200, 409]);
  expect(race.find((item) => item.response.status() === 409)?.body).not.toHaveProperty("view");

  const ownerGet = await modeContext.request.get(
    `/api/review-os/trusted-repair?sessionId=${startView.session.sessionId}`,
    { headers: { Purpose: "prefetch" } },
  );
  expect(ownerGet.status()).toBe(200);
  expect(ownerGet.headers()["cache-control"]).toContain("no-store");
  expect(ownerGet.headers().vary).toContain("Cookie");

  let exposureView = (
    await apiCommand(modeContext, "start", {
      subject: "appraisal_practical",
      inputMode: "TYPED_TEXT",
    })
  ).body.view;
  for (const [action, fields] of [
    ["confirm_revision", { body: "합성 확정 수정본" }],
    ["commit_prediction", { prediction: "likely_partial", confidence: "medium" }],
    ["commit_attempt", { body: "독립 근거 일부를 직접 적었지만 핵심은 빠져 있다." }],
    ["commit_self_diagnosis", { selfDiagnosisCode: "missing_core_reason" }],
    ["diagnose", {}],
  ] as const) {
    const step = await apiCommand(modeContext, action, {
      sessionId: exposureView.session.sessionId,
      expectedVersion: exposureView.session.recordVersion,
      ...fields,
    });
    expect(step.response.status()).toBe(200);
    exposureView = step.body.view;
    expect(exposureView.scaffold).toBeNull();
  }
  const exposureRaceFields = {
    sessionId: exposureView.session.sessionId,
    expectedVersion: exposureView.session.recordVersion,
  };
  const exposureRace = await Promise.all([
    apiCommand(modeContext, "request_scaffold", exposureRaceFields),
    apiCommand(modeContext, "request_scaffold", exposureRaceFields),
  ]);
  expect(exposureRace.map((item) => item.response.status()).sort()).toEqual([200, 409]);
  expect(exposureRace.find((item) => item.response.status() === 200)?.body.view.scaffold).not.toBeNull();
  const exposureLoser = exposureRace.find((item) => item.response.status() === 409)?.body;
  expect(exposureLoser).not.toHaveProperty("view");
  expect(JSON.stringify(exposureLoser)).not.toContain("scaffold");

  const firstPartial = await createFirstPartialTheory(modeContext);
  const durablePartialIdentity = {
    sessionId: firstPartial.session.sessionId,
    revisionNumber: firstPartial.session.revisionNumber,
    primaryGapId: firstPartial.session.primaryGapId,
  };
  const partialContext = await contextFor(browser);
  const partialPage = await partialContext.newPage();
  let retryRequest: Record<string, unknown> | null = null;
  partialPage.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/review-os/trusted-repair"
    ) {
      const body = request.postDataJSON() as Record<string, unknown>;
      if (body.action === "submit_repair") retryRequest = body;
    }
  });
  await partialPage.goto(
    `/app/trusted-repair?sessionId=${encodeURIComponent(firstPartial.session.sessionId)}`,
  );
  await expectState(partialPage, "partial");
  await expect(partialPage.getByLabel("남은 기준 다시 쓰기")).toBeVisible();
  await expect(
    partialPage.getByRole("button", { name: "남은 기준 다시 쓰기" }),
  ).toBeVisible();
  await partialPage.reload();
  await expectState(partialPage, "partial");
  await expect(partialPage.getByLabel("남은 기준 다시 쓰기")).toBeVisible();
  await fillText(
    partialPage,
    "남은 기준 다시 쓰기",
    "최유효이용은 비합리적이며 불가능하다",
    false,
  );
  await activatePrimary(partialPage, false);
  await expectState(partialPage, "repair_submitted");
  expect(retryRequest).not.toBeNull();
  const afterRetryLoad = await partialContext.request.get(
    `/api/review-os/trusted-repair?sessionId=${firstPartial.session.sessionId}`,
  );
  expect(afterRetryLoad.status()).toBe(200);
  const afterRetryView = (await afterRetryLoad.json()).view;
  expect(afterRetryView.session.repairSubmissionCount).toBe(2);
  expect({
    sessionId: afterRetryView.session.sessionId,
    revisionNumber: afterRetryView.session.revisionNumber,
    primaryGapId: afterRetryView.session.primaryGapId,
  }).toEqual(durablePartialIdentity);
  const replayedRetry = await apiCommand(
    partialContext,
    "submit_repair",
    {
      sessionId: retryRequest?.sessionId,
      expectedVersion: retryRequest?.expectedVersion,
      body: "재전송은 기존 append-only 결과를 바꾸지 않는다",
    },
    String(retryRequest?.commandId),
  );
  expect(replayedRetry.response.status()).toBe(200);
  expect(replayedRetry.body.view.session.recordVersion).toBe(
    afterRetryView.session.recordVersion,
  );
  expect(replayedRetry.body.view.session.repairSubmissionCount).toBe(2);
  await activatePrimary(partialPage, false);
  await expectState(partialPage, "partial");
  await expect(
    partialPage.getByRole("button", { name: "가이드로 전환" }),
  ).toBeVisible();
  await partialPage.getByText("다른 방식으로 하기").click();
  await expect(
    partialPage.getByRole("button", { name: /DEFER_FOR_NOW/ }),
  ).toBeVisible();
  expect(partialPage.url()).toContain(firstPartial.session.sessionId);
  const exhaustedLoad = await partialContext.request.get(
    `/api/review-os/trusted-repair?sessionId=${firstPartial.session.sessionId}`,
  );
  const exhaustedView = (await exhaustedLoad.json()).view;
  expect(exhaustedView.session.immediatePartialRetryAvailable).toBe(false);
  const thirdSubmission = await apiCommand(partialContext, "submit_repair", {
    sessionId: exhaustedView.session.sessionId,
    expectedVersion: exhaustedView.session.recordVersion,
    body: repairs.appraisal_theory,
  });
  expect(thirdSubmission.response.status()).toBe(409);
  expect(thirdSubmission.body).not.toHaveProperty("view");
  await partialContext.close();

  const correctablePartial = await createFirstPartialTheory(modeContext);
  const correctedRetry = await apiCommand(modeContext, "submit_repair", {
    sessionId: correctablePartial.session.sessionId,
    expectedVersion: correctablePartial.session.recordVersion,
    body: "최유효이용은 합리적이고 가능한 이용이다",
  });
  expect(correctedRetry.response.status()).toBe(200);
  expect(correctedRetry.body.view.session.repairSubmissionCount).toBe(2);
  const correctedVerification = await apiCommand(modeContext, "continue", {
    sessionId: correctedRetry.body.view.session.sessionId,
    expectedVersion: correctedRetry.body.view.session.recordVersion,
    continuation: "VERIFY_AND_CONTINUE",
  });
  expect(correctedVerification.response.status()).toBe(200);
  expect(correctedVerification.body.view.session.state).toBe("verified");

  const lexicalCurrencyCase = await completeApiRepairCase({
    context: modeContext,
    subject: "appraisal_practical",
    attemptBody:
      "수량 100m²와 단위가격 2000000을 곱해 200000000을 얻는다. m² 단위 양수이며 오류 원인을 점검한다. 반올림 없음으로 쓰고 역산하여 검산한다.",
    repairBody:
      "수량 100m²와 단위가격 2000000을 곱해 200000000을 얻는다. m² 단위 양수이며 오류 원인을 점검한다. 반올림 없음으로 쓰고 역산하여 검산한다.",
  });
  expect(lexicalCurrencyCase.diagnosedView.session.primaryGapId).toBe(
    "gap-practice-unit-rounding-verification",
  );
  expect(
    lexicalCurrencyCase.diagnosedView.diagnosis.candidates.find(
      (candidate: { gapId: string }) =>
        candidate.gapId === "gap-practice-unit-rounding-verification",
    )?.supportingEvidence,
  ).toContain(
    "independent_attempt:practice-unit-rounding-verification:missing:원",
  );
  expect(lexicalCurrencyCase.finalView.session.state).toBe("partial");

  const sameClauseConflictCase = await completeApiRepairCase({
    context: modeContext,
    subject: "appraisal_theory",
    attemptBody:
      "법적·물리적·경제적 가능성을 사례와 반대 사실에 적용해 결론을 낸다.",
    repairBody:
      "최유효이용은 합리적이지만 합리적이지 않고 가능하다",
  });
  expect(sameClauseConflictCase.diagnosedView.session.primaryGapId).toBe(
    "gap-theory-exact-definition",
  );
  expect(sameClauseConflictCase.finalView.session.state).toBe("partial");

  const contextB = await contextFor(browser, emailB, passwordB);
  const crossTenant = await contextB.request.get(
    `/api/review-os/trusted-repair?sessionId=${startView.session.sessionId}`,
  );
  expect(crossTenant.status()).toBe(404);
  await contextB.close();
  await modeContext.close();

  const values = Object.values(timings).sort((left, right) => left - right);
  const evidence = {
    subjectRuns: subjects.map((subject) => ({ subject, result: "passed", durationMs: timings[subject] })),
    medianDurationMs: values[1],
    responsiveWidths: [390, 768, 1440],
    inputModes: [...inputModes],
    axeSeriousCritical: 0,
    keyboardOnly: "passed",
    newBrowserRecovery: "passed",
    partialRetryRefreshAndBrowserRecovery: "passed",
    partialRetryCasIdempotencyAndBound: "passed",
    correctedPartialRetryVerification: "passed",
    lexicalCurrencyBoundaryFailClosed: "passed",
    sameClausePolarityConflictFailClosed: "passed",
    providerNetworkRequests: 0,
  };
  if (evidencePath) writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
});

test("process restart recovers a bodyless canonical session", async ({ browser }) => {
  requireRuntime();
  test.skip(!recoverySessionId, "restart recovery runs only after the server is restarted");
  const context = await contextFor(browser);
  const page = await context.newPage();
  const foreignHosts = monitorProviderBoundary(page);
  await page.goto(`/app/trusted-repair?sessionId=${encodeURIComponent(recoverySessionId)}`);
  await expectState(page, "partial");
  await expect(page.locator("[data-primary-action]:visible")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: /남은 기준 다시 쓰기|가이드로 전환/ }),
  ).toBeVisible();
  expect(page.url()).toContain(recoverySessionId);
  expect([...foreignHosts]).toEqual([]);
  await context.close();
});
