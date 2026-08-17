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
const crossSubjectReplayPhase =
  process.env.WCV_C2_CROSS_SUBJECT_REPLAY_PHASE ?? "";
const crossSubjectLawCommandId =
  process.env.WCV_C2_CROSS_SUBJECT_LAW_COMMAND_ID ?? "";
const crossSubjectPracticeCommandId =
  process.env.WCV_C2_CROSS_SUBJECT_PRACTICE_COMMAND_ID ?? "";

const finalLawConfirmations: Record<string, unknown>[] = [];
const modes = [
  "TYPED_TEXT",
  "EDITABLE_PHOTO_OCR",
  "EDITABLE_PDF_OCR",
  "EDITABLE_VOICE_TRANSCRIPTION",
  "STRUCTURED_SELECTION",
] as const;
const candidateText =
  "합성 공식법령 제10조의 출처와 버전, 효력기간, 적용일과 차단 상태를 확인해야 한다.";
const repairedText =
  "합성 공식법령 2026-01-01 버전 Article 10은 2026-08-15 현재 적용 가능하고 열린 차단 근거는 0개이다.";

function requireRuntime() {
  if (!baseURL || !emailA || !passwordA || !emailB || !passwordB) {
    throw new Error("c2r-c-l browser runtime environment is incomplete");
  }
  if (!new Set(["127.0.0.1", "localhost", "::1"]).has(new URL(baseURL).hostname)) {
    throw new Error("c2r-c-l browser runtime refused a non-local target");
  }
}

async function login(context: BrowserContext, email: string, password: string) {
  const response = await context.request.post("/api/auth/sign-in", {
    data: { email, password, mode: "second" },
  });
  expect(response.status()).toBe(200);
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

async function apiCommand(
  context: BrowserContext,
  action: string,
  fields: Record<string, unknown>,
  commandId = randomUUID(),
) {
  const response = await context.request.post("/api/review-os/trusted-repair", {
    data: { action, commandId, ...fields },
  });
  return { response, body: await response.json() };
}

function lawClaim(
  view: { lawStructuredConfirmation: Record<string, unknown> },
  overrides: Record<string, unknown> = {},
) {
  const confirmation = view.lawStructuredConfirmation;
  return {
    sourceRevisionId: confirmation.sourceRevisionId,
    anchorId: confirmation.anchorId,
    anchorVersionId: confirmation.anchorVersionId,
    lawSourceBindingId: confirmation.lawSourceBindingId,
    sourceId: confirmation.sourceId,
    sourceVersionId: confirmation.sourceVersionId,
    lawAnchorId: confirmation.lawAnchorId,
    lawAnchorVersionId: confirmation.lawAnchorVersionId,
    exactLocator: confirmation.exactLocator,
    exactVersionIdentity: confirmation.exactVersionIdentity,
    effectiveFrom: confirmation.effectiveFrom,
    effectiveTo: confirmation.effectiveTo,
    applicableAsOf: confirmation.applicableAsOf,
    currentLawApplicability: confirmation.currentLawApplicability,
    blockerState: confirmation.blockerState,
    confirmationMode: "MANUAL_STRUCTURED",
    ...overrides,
  };
}

async function progressToRepairSubmitted(
  context: BrowserContext,
  inputMode = "TYPED_TEXT",
) {
  let result = await apiCommand(context, "start", {
    subject: "appraisal_law",
    inputMode,
  });
  expect(result.response.status()).toBe(200);
  let view = result.body.view;
  const transition = async (
    action: string,
    fields: Record<string, unknown> = {},
  ) => {
    result = await apiCommand(context, action, {
      sessionId: view.session.sessionId,
      expectedVersion: view.session.recordVersion,
      ...fields,
    });
    expect(result.response.status()).toBe(200);
    view = result.body.view;
  };
  await transition("confirm_revision", { body: "합성 법규 확정 수정본" });
  await transition("commit_prediction", {
    prediction: "likely_partial",
    confidence: "medium",
  });
  await transition("commit_attempt", { body: candidateText });
  await transition("commit_self_diagnosis", {
    selfDiagnosisCode: "exact_law_binding_required",
  });
  await transition("diagnose");
  await transition("request_scaffold");
  await transition("submit_repair", { body: repairedText });
  expect(view.session.state).toBe("repair_submitted");
  return view;
}

async function createPartial(context: BrowserContext) {
  const submitted = await progressToRepairSubmitted(context);
  const result = await apiCommand(context, "confirm_law_claim", {
    sessionId: submitted.session.sessionId,
    expectedVersion: submitted.session.recordVersion,
    claim: lawClaim(submitted, { exactLocator: "Article 11" }),
  });
  expect(result.response.status()).toBe(200);
  expect(result.body.view.session.state).toBe("partial");
  return result.body.view;
}

async function expectState(page: Page, state: string) {
  await expect(page.locator("[data-trusted-repair-state]")).toHaveAttribute(
    "data-trusted-repair-state",
    state,
  );
}

async function activate(page: Page, keyboardOnly = false) {
  const button = page.locator("[data-primary-action]");
  if (keyboardOnly) {
    await button.focus();
    await page.keyboard.press("Enter");
  } else {
    await button.click();
  }
}

function writeEvidence() {
  if (!evidencePath) return;
  writeFileSync(
    evidencePath,
    `${JSON.stringify({ finalLawConfirmations }, null, 2)}\n`,
    { mode: 0o600 },
  );
}

async function completeLawJourney(
  browser: Browser,
  viewport: { width: number; height: number },
  keyboardOnly: boolean,
  inputMode: (typeof modes)[number],
) {
  const context = await contextFor(browser, emailA, passwordA, viewport);
  const page = await context.newPage();
  const foreignHosts = new Set<string>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== new URL(baseURL).origin) foreignHosts.add(url.host);
  });
  await page.goto("/app/trusted-repair");
  await expect(page.getByLabel("과목")).toHaveValue("appraisal_law");
  await expect(page.getByLabel("과목").locator("option")).toHaveCount(1);
  await page.getByLabel("편집 가능한 입력").selectOption(inputMode);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(
    axe.violations.filter(
      (item) => item.impact === "serious" || item.impact === "critical",
    ),
  ).toEqual([]);
  await activate(page, keyboardOnly);
  await expectState(page, "editable_capture_draft");
  await activate(page, keyboardOnly);
  await activate(page, keyboardOnly);
  await page.getByLabel("도움 전 독립 시도").fill(candidateText);
  await activate(page, keyboardOnly);
  await activate(page, keyboardOnly);
  await activate(page, keyboardOnly);
  await expectState(page, "diagnosed");
  await activate(page, keyboardOnly);
  await page.getByLabel("복구 답안").fill(repairedText);
  await activate(page, keyboardOnly);
  await expectState(page, "repair_submitted");
  const lawStructuredConfirmationExisted =
    (await page.getByText("직접 확인하는 정확 법규적용 결합").count()) === 1;
  const responsePromise = page.waitForResponse((response) => {
    try {
      return (
        response.request().method() === "POST" &&
        response.request().postDataJSON()?.action === "confirm_law_claim"
      );
    } catch {
      return false;
    }
  });
  await activate(page, keyboardOnly);
  const response = await responsePromise;
  const body = await response.json();
  const diagnostic = {
    preState: "repair_submitted",
    responseStatus: response.status(),
    safeErrorCode: body.error ?? null,
    postState: body.view?.session?.state ?? null,
    proofEvaluationState:
      body.view?.session?.proofEvaluation?.state ?? null,
    proofReasonCodeIds:
      body.view?.session?.proofEvaluation?.reasonCodes ?? [],
    recordVersion: body.view?.session?.recordVersion ?? null,
    lawStructuredConfirmationExisted,
  };
  finalLawConfirmations.push(diagnostic);
  writeEvidence();
  expect(diagnostic).toMatchObject({
    responseStatus: 200,
    safeErrorCode: null,
    postState: "verified",
    proofEvaluationState: "PASS",
    proofReasonCodeIds: [],
    lawStructuredConfirmationExisted: true,
  });
  await expect(page.getByLabel("법규적용 검증 상태")).toContainText("PASS");
  expect([...foreignHosts]).toEqual([]);
  await context.close();
}

test.beforeAll(requireRuntime);

test("cross-subject start replay seed", async ({ browser }) => {
  test.skip(crossSubjectReplayPhase !== "seed");
  const context = await contextFor(browser);
  const law = await apiCommand(
    context,
    "start",
    { subject: "appraisal_law", inputMode: "TYPED_TEXT" },
    crossSubjectLawCommandId,
  );
  const practice = await apiCommand(
    context,
    "start",
    { subject: "appraisal_practical", inputMode: "TYPED_TEXT" },
    crossSubjectPracticeCommandId,
  );
  expect(law.response.status()).toBe(200);
  expect(practice.response.status()).toBe(200);
  await context.close();
});

test("cross-subject start replay is denied with Law disabled", async ({
  browser,
}) => {
  test.skip(crossSubjectReplayPhase !== "verify_practice");
  const context = await contextFor(browser);
  const result = await apiCommand(
    context,
    "start",
    { subject: "appraisal_law", inputMode: "TYPED_TEXT" },
    crossSubjectLawCommandId,
  );
  expect(result.response.status()).toBe(404);
  expect(result.body.error).toBe("not_found");
  await context.close();
});

test("cross-subject start replay is denied with Practice disabled", async ({
  browser,
}) => {
  test.skip(crossSubjectReplayPhase !== "verify_law");
  const context = await contextFor(browser);
  const result = await apiCommand(
    context,
    "start",
    { subject: "appraisal_practical", inputMode: "TYPED_TEXT" },
    crossSubjectPracticeCommandId,
  );
  expect(result.response.status()).toBe(404);
  expect(result.body.error).toBe("not_found");
  await context.close();
});

test("Law browser-to-Postgres vertical, bounded retry, idempotency, and tenant isolation", async ({ browser }) => {
  const viewports = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 1000 },
  ];
  for (const [index, viewport] of viewports.entries()) {
    await completeLawJourney(
      browser,
      viewport,
      index === 1,
      modes[index],
    );
  }
  const owner = await contextFor(browser);
  for (const mode of modes.slice(3)) {
    const submitted = await progressToRepairSubmitted(owner, mode);
    expect(submitted.session.subject).toBe("appraisal_law");
  }
  const correctedPartial = await createPartial(owner);
  let corrected = await apiCommand(owner, "submit_repair", {
    sessionId: correctedPartial.session.sessionId,
    expectedVersion: correctedPartial.session.recordVersion,
    body: repairedText,
  });
  corrected = await apiCommand(owner, "confirm_law_claim", {
    sessionId: corrected.body.view.session.sessionId,
    expectedVersion: corrected.body.view.session.recordVersion,
    claim: lawClaim(corrected.body.view),
  });
  expect(corrected.body.view.session.state).toBe("verified");

  const failedPartial = await createPartial(owner);
  let failed = await apiCommand(owner, "submit_repair", {
    sessionId: failedPartial.session.sessionId,
    expectedVersion: failedPartial.session.recordVersion,
    body: repairedText,
  });
  failed = await apiCommand(owner, "confirm_law_claim", {
    sessionId: failed.body.view.session.sessionId,
    expectedVersion: failed.body.view.session.recordVersion,
    claim: lawClaim(failed.body.view, { applicableAsOf: "2025-12-31" }),
  });
  expect(failed.body.view.session.state).toBe("partial");
  expect(failed.body.view.session.immediatePartialRetryAvailable).toBe(false);

  const startCommandId = randomUUID();
  const first = await apiCommand(
    owner,
    "start",
    { subject: "appraisal_law", inputMode: "TYPED_TEXT" },
    startCommandId,
  );
  const replay = await apiCommand(
    owner,
    "start",
    { subject: "appraisal_law", inputMode: "TYPED_TEXT" },
    startCommandId,
  );
  expect(replay.body.view.session.sessionId).toBe(
    first.body.view.session.sessionId,
  );

  const other = await contextFor(browser, emailB, passwordB);
  const isolated = await other.request.get(
    `/api/review-os/trusted-repair?sessionId=${corrected.body.view.session.sessionId}`,
  );
  expect(isolated.status()).toBe(404);
  await other.close();
  await owner.close();
});

test("process restart recovers a bodyless Law session", async ({ browser }) => {
  test.skip(!recoverySessionId);
  const context = await contextFor(browser);
  const response = await context.request.get(
    `/api/review-os/trusted-repair?sessionId=${recoverySessionId}`,
  );
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.view.session.subject).toBe("appraisal_law");
  expect(body.view.fixture).not.toHaveProperty("editableDrafts");
  expect(JSON.stringify(body.view)).not.toContain(candidateText);
  await context.close();
});
