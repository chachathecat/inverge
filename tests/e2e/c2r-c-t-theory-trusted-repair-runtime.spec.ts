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
const freeFormCandidate =
  "수익방식과 원가방식은 모두 가치를 설명하지만 목표 범위와 술어 극성을 아직 구분하지 않았다.";
const reconstructedTheory =
  "수익방식은 기대수익을 가치로 전환하며 역사적 원가만 사용한다는 설명은 별도 원가방식 반례에 속한다.";

function requireRuntime() {
  if (!baseURL || !emailA || !passwordA || !emailB || !passwordB) {
    throw new Error("c2r-c-t browser runtime environment is incomplete");
  }
  if (!new Set(["127.0.0.1", "localhost", "::1"]).has(new URL(baseURL).hostname)) {
    throw new Error("c2r-c-t browser runtime refused a non-local target");
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

async function expectState(page: Page, state: string) {
  await expect(page.locator("[data-trusted-repair-state]")).toHaveAttribute(
    "data-trusted-repair-state",
    state,
  );
}

async function activate(page: Page, keyboardOnly = false) {
  const button = page.locator("[data-primary-action]");
  await expect(button).toHaveCount(1);
  if (keyboardOnly) {
    await button.focus();
    await page.keyboard.press("Enter");
  } else {
    await button.click();
  }
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
  return { response, body: await response.json() };
}

function theoryClaim(
  view: {
    theoryStructuredConfirmation: {
      sourceRevisionId: string;
      anchorId: string;
      anchorVersionId: string;
      targetScopeId: string;
      requiredPredicates: readonly string[];
      forbiddenPredicates: readonly string[];
      counterexampleScopes: readonly string[];
    };
  },
  disposition: "pass" | "negated" | "cross_target" = "pass",
) {
  const confirmation = view.theoryStructuredConfirmation;
  const scopeId =
    disposition === "cross_target"
      ? confirmation.counterexampleScopes[0]
      : confirmation.targetScopeId;
  return {
    sourceRevisionId: confirmation.sourceRevisionId,
    anchorId: confirmation.anchorId,
    anchorVersionId: confirmation.anchorVersionId,
    targetScopeId: confirmation.targetScopeId,
    clauses: [
      {
        clauseIndex: 1,
        scopeResolution: "EXACT",
        scopeId,
        predicates: [
          {
            predicateId: confirmation.requiredPredicates[0],
            polarity: disposition === "negated" ? "NEGATED" : "ASSERTED",
          },
        ],
      },
      {
        clauseIndex: 2,
        scopeResolution: "EXACT",
        scopeId,
        predicates: [
          {
            predicateId: confirmation.forbiddenPredicates[0],
            polarity: "NEGATED",
          },
        ],
      },
    ],
    confirmationMode: "MANUAL_STRUCTURED",
  };
}

async function progressToRepairSubmitted(context: BrowserContext) {
  let result = await apiCommand(context, "start", {
    subject: "appraisal_theory",
    inputMode: "TYPED_TEXT",
  });
  let view = result.body.view;
  const transition = async (action: string, fields: Record<string, unknown> = {}) => {
    result = await apiCommand(context, action, {
      sessionId: view.session.sessionId,
      expectedVersion: view.session.recordVersion,
      ...fields,
    });
    expect(result.response.status()).toBe(200);
    view = result.body.view;
  };
  await transition("confirm_revision", { body: "합성 이론 확정 수정본" });
  await transition("commit_prediction", {
    prediction: "likely_partial",
    confidence: "medium",
  });
  await transition("commit_attempt", { body: freeFormCandidate });
  await transition("commit_self_diagnosis", {
    selfDiagnosisCode: "target_scope_or_polarity_drift",
  });
  await transition("diagnose");
  await transition("request_scaffold");
  await transition("submit_repair", { body: reconstructedTheory });
  expect(view.session.state).toBe("repair_submitted");
  return view;
}

async function createPartial(context: BrowserContext) {
  const submitted = await progressToRepairSubmitted(context);
  const result = await apiCommand(context, "confirm_theory_claim", {
    sessionId: submitted.session.sessionId,
    expectedVersion: submitted.session.recordVersion,
    claim: theoryClaim(submitted, "negated"),
  });
  expect(result.response.status()).toBe(200);
  expect(result.body.view.session.state).toBe("partial");
  expect(result.body.view.session.immediatePartialRetryAvailable).toBe(true);
  return result.body.view;
}

async function completeTheoryJourney(
  browser: Browser,
  viewport: { width: number; height: number },
  keyboardOnly = false,
) {
  const context = await contextFor(browser, emailA, passwordA, viewport);
  const page = await context.newPage();
  const foreignHosts = new Set<string>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== new URL(baseURL).origin) foreignHosts.add(url.host);
  });
  const startedAt = Date.now();
  await page.goto("/app/trusted-repair");
  await expectState(page, "start");
  await expect(page.getByLabel("과목")).toHaveValue("appraisal_theory");
  await expect(page.getByLabel("과목").locator("option")).toHaveCount(1);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(
    axe.violations.filter(
      (item) => item.impact === "serious" || item.impact === "critical",
    ),
  ).toEqual([]);
  await activate(page, keyboardOnly);
  await expectState(page, "editable_capture_draft");
  await activate(page, keyboardOnly);
  await expectState(page, "revision_confirmed");
  await activate(page, keyboardOnly);
  await expectState(page, "prediction_committed");
  await page.getByLabel("도움 전 독립 시도").fill(freeFormCandidate);
  await activate(page, keyboardOnly);
  await expectState(page, "independent_attempt_committed");
  await activate(page, keyboardOnly);
  await expectState(page, "self_diagnosis_committed");
  await activate(page, keyboardOnly);
  await expectState(page, "diagnosed");
  await expect(page.getByLabel("이론술어 검증 상태")).toHaveCount(0);
  await activate(page, keyboardOnly);
  await expectState(page, "exposure_committed");
  await expect(page.getByLabel("커밋된 최소 도움")).toBeVisible();
  await page.getByLabel("복구 답안").fill(reconstructedTheory);
  await activate(page, keyboardOnly);
  await expectState(page, "repair_submitted");
  await expect(page.getByLabel("필수 술어 극성")).toHaveValue("ASSERTED");
  await expect(page.getByLabel("금지 술어 극성")).toHaveValue("NEGATED");
  await activate(page, keyboardOnly);
  await expectState(page, "verified");
  await expect(page.getByLabel("이론술어 검증 상태")).toContainText("PASS");
  expect([...foreignHosts]).toEqual([]);
  await context.close();
  return Date.now() - startedAt;
}

test("Theory browser-to-Postgres vertical, bounded retry, idempotency, and tenant isolation", async ({ browser }) => {
  requireRuntime();
  test.skip(Boolean(recoverySessionId), "normal pass is omitted during restart recovery");
  const timings = [
    await completeTheoryJourney(browser, { width: 390, height: 844 }, true),
    await completeTheoryJourney(browser, { width: 768, height: 900 }),
    await completeTheoryJourney(browser, { width: 1440, height: 900 }),
  ];

  const owner = await contextFor(browser);
  const modePage = await owner.newPage();
  for (const inputMode of inputModes) {
    await modePage.goto("/app/trusted-repair");
    await modePage.getByLabel("편집 가능한 입력").selectOption(inputMode);
    await activate(modePage);
    await expectState(modePage, "editable_capture_draft");
  }
  await modePage.close();

  const forged = await owner.request.post("/api/review-os/trusted-repair", {
    data: {
      action: "start",
      subject: "appraisal_theory",
      inputMode: "TYPED_TEXT",
      commandId: randomUUID(),
      verified: true,
    },
  });
  expect(forged.status()).toBe(400);
  const practiceDenied = await apiCommand(owner, "start", {
    subject: "appraisal_practical",
    inputMode: "TYPED_TEXT",
  });
  expect(practiceDenied.response.status()).toBe(404);

  const startCommandId = randomUUID();
  const duplicateStart = await Promise.all([
    apiCommand(
      owner,
      "start",
      { subject: "appraisal_theory", inputMode: "TYPED_TEXT" },
      startCommandId,
    ),
    apiCommand(
      owner,
      "start",
      { subject: "appraisal_theory", inputMode: "TYPED_TEXT" },
      startCommandId,
    ),
  ]);
  expect(duplicateStart.map((item) => item.response.status()).sort()).toEqual([
    200,
    200,
  ]);
  expect(duplicateStart[0].body.view.session.sessionId).toBe(
    duplicateStart[1].body.view.session.sessionId,
  );

  const corrected = await createPartial(owner);
  const correctedRepair = await apiCommand(owner, "submit_repair", {
    sessionId: corrected.session.sessionId,
    expectedVersion: corrected.session.recordVersion,
    body: reconstructedTheory,
  });
  const correctedProof = await apiCommand(owner, "confirm_theory_claim", {
    sessionId: correctedRepair.body.view.session.sessionId,
    expectedVersion: correctedRepair.body.view.session.recordVersion,
    claim: theoryClaim(correctedRepair.body.view),
  });
  expect(correctedProof.body.view.session.state).toBe("verified");

  const exhausted = await createPartial(owner);
  const failedRepair = await apiCommand(owner, "submit_repair", {
    sessionId: exhausted.session.sessionId,
    expectedVersion: exhausted.session.recordVersion,
    body: freeFormCandidate,
  });
  const failedProof = await apiCommand(owner, "confirm_theory_claim", {
    sessionId: failedRepair.body.view.session.sessionId,
    expectedVersion: failedRepair.body.view.session.recordVersion,
    claim: theoryClaim(failedRepair.body.view, "cross_target"),
  });
  expect(failedProof.body.view.session.state).toBe("partial");
  expect(failedProof.body.view.session.immediatePartialRetryAvailable).toBe(false);
  const thirdSubmission = await apiCommand(owner, "submit_repair", {
    sessionId: failedProof.body.view.session.sessionId,
    expectedVersion: failedProof.body.view.session.recordVersion,
    body: reconstructedTheory,
  });
  expect(thirdSubmission.response.status()).toBe(409);

  const otherUser = await contextFor(browser, emailB, passwordB);
  const crossTenant = await otherUser.request.get(
    `/api/review-os/trusted-repair?sessionId=${corrected.session.sessionId}`,
  );
  expect(crossTenant.status()).toBe(404);
  await otherUser.close();
  await owner.close();

  timings.sort((left, right) => left - right);
  const evidence = {
    subjectRuns: [
      {
        subject: "appraisal_theory",
        result: "passed",
        durationMs: timings[1],
      },
    ],
    medianDurationMs: timings[1],
    responsiveWidths: [390, 768, 1440],
    inputModes: [...inputModes],
    axeSeriousCritical: 0,
    keyboardOnly: "passed",
    exactStructuredTheoryClaimPass: "passed",
    targetScopeAndPolarityFailClosed: "passed",
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

test("process restart recovers a bodyless Theory session", async ({ browser }) => {
  requireRuntime();
  test.skip(!recoverySessionId, "restart recovery runs only after server restart");
  const context = await contextFor(browser);
  const page = await context.newPage();
  await page.goto(
    `/app/trusted-repair?sessionId=${encodeURIComponent(recoverySessionId)}`,
  );
  await expectState(page, "partial");
  await expect(page.locator("[data-primary-action]:visible")).toHaveCount(1);
  await context.close();
});
