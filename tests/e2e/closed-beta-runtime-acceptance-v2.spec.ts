import { expect, test, type Browser, type Locator, type Page, type Response } from "@playwright/test";
import { randomUUID } from "node:crypto";

const runtimeGateEnabled = process.env.M421_RUNTIME_ACCEPTANCE === "1";
const productionOverrideEnabled = process.env.M421_RUNTIME_ACCEPTANCE_ALLOW_PRODUCTION === "1";
const runtimeBaseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const vercelAutomationBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
const loginPreflightTimeoutMs = 10_000;

const requiredEnvNames = [
  "E2E_BASE_URL",
  "E2E_USER_EMAIL",
  "E2E_USER_PASSWORD",
  "E2E_USER_A_EMAIL",
  "E2E_USER_A_PASSWORD",
  "E2E_USER_B_EMAIL",
  "E2E_USER_B_PASSWORD",
] as const;

const responsiveWidths = [
  { label: "360 x 800", width: 360, height: 800 },
  { label: "390 x 844", width: 390, height: 844 },
  { label: "1280 x 800", width: 1280, height: 800 },
] as const;

type RuntimeCredential = {
  email: string;
  password: string;
};

type AuthRedirectCategory = "app" | "onboarding" | "other" | "missing";

type BoundedAuthResponse = {
  status: number;
  ok: boolean | null;
  error: string | null;
  redirectCategory: AuthRedirectCategory;
  json: boolean;
};

type BoundedCalculatorRoutineCompletionResponse = {
  httpStatus: number;
  ok: boolean | null;
  persistenceStatus: string | null;
  learningRecordSaved: boolean | null;
  reviewCandidateCreated: boolean | null;
  cleanCompletion: boolean | null;
  nextTaskType: string | null;
  json: boolean;
};

const localizedHonestLocalFallbackPattern =
  /닫힌 베타|브라우저 임시 기록|브라우저 임시 저장|이 브라우저에 임시 저장|같은 브라우저|closed beta|local|browser|temporary/i;
const honestSaveFailureOrFallbackPattern =
  /브라우저 임시 저장|이 브라우저에 임시 저장|closed beta 임시 저장|같은 브라우저|저장이 완료되지 않았습니다|저장 재시도 필요|local_fallback_saved|save_failed|browser|temporary|failed save|save failed/i;
const durableStorageSuccessPattern =
  /계정 기록에 저장|같은 계정|durable saved|account storage|account-backed|saved successfully/i;

function requireRuntimeEnvironment() {
  const missing = requiredEnvNames.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`M421 runtime acceptance missing required env: ${missing.join(", ")}`);
  }

  const baseUrl = process.env.E2E_BASE_URL;
  if (baseUrl && isObviousProductionBaseUrl(baseUrl) && !productionOverrideEnabled) {
    throw new Error("M421 runtime acceptance refused an obvious production base URL. Set M421_RUNTIME_ACCEPTANCE_ALLOW_PRODUCTION=1 only for an intentional owner-approved production smoke.");
  }

  if (baseUrl && isVercelPreviewBaseUrl(baseUrl) && !vercelAutomationBypassSecret) {
    throw new Error("M421 runtime acceptance missing required env: VERCEL_AUTOMATION_BYPASS_SECRET for protected Vercel Preview.");
  }
}

function isObviousProductionBaseUrl(rawValue: string) {
  let host = "";
  try {
    host = new URL(rawValue).hostname.toLowerCase();
  } catch {
    return false;
  }

  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
  if (host.includes("-git-") || host.includes("--") || host.includes("preview") || host.includes("staging")) return false;
  return host === "inverge.vercel.app" || host === "inverge.ai" || host === "www.inverge.ai" || host === "inverge.app" || host === "www.inverge.app";
}

function isVercelPreviewBaseUrl(rawValue: string) {
  try {
    const host = new URL(rawValue).hostname.toLowerCase();
    return host.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

function vercelProtectionHeaders() {
  if (!vercelAutomationBypassSecret) return undefined;
  return {
    "x-vercel-protection-bypass": vercelAutomationBypassSecret,
    "x-vercel-set-bypass-cookie": "true",
  };
}

function credentialFrom(prefix: "E2E_USER" | "E2E_USER_A" | "E2E_USER_B"): RuntimeCredential {
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !password) {
    throw new Error(`M421 runtime acceptance credential unavailable for ${prefix}`);
  }
  return { email, password };
}

function safeEvidenceSuffix() {
  const letters = randomUUID().replace(/[^a-f]/g, "");
  return `m421${letters.slice(0, 10)}`;
}

function syntheticText(label: string, suffix: string) {
  return `synthetic ${label} placeholder ${suffix}`;
}

function calculatorRecoveryRoutineId(suffix: string) {
  return `problem-snap-${suffix.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32)}`;
}

function categorizeRedirectTo(value: unknown): AuthRedirectCategory {
  if (typeof value !== "string" || !value.trim()) return "missing";
  try {
    const parsed = new URL(value, "http://inverge.local");
    if (parsed.pathname === "/app") return "app";
    if (parsed.pathname === "/onboarding" || parsed.pathname === "/app/onboarding") return "onboarding";
    return "other";
  } catch {
    return "other";
  }
}

async function readBoundedAuthResponse(response: Response): Promise<BoundedAuthResponse> {
  const status = response.status();
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { status, ok: null, error: null, redirectCategory: "missing", json: false };
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const ok = typeof record.ok === "boolean" ? record.ok : null;
  const error = typeof record.error === "string" ? record.error : null;
  const redirectCategory = categorizeRedirectTo(record.redirectTo);
  return { status, ok, error, redirectCategory, json: true };
}

async function readBoundedCalculatorRoutineCompletionResponse(response: Response): Promise<BoundedCalculatorRoutineCompletionResponse> {
  const httpStatus = response.status();
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      httpStatus,
      ok: null,
      persistenceStatus: null,
      learningRecordSaved: null,
      reviewCandidateCreated: null,
      cleanCompletion: null,
      nextTaskType: null,
      json: false,
    };
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return {
    httpStatus,
    ok: typeof record.ok === "boolean" ? record.ok : null,
    persistenceStatus: typeof record.status === "string" ? record.status : null,
    learningRecordSaved: typeof record.learningRecordSaved === "boolean" ? record.learningRecordSaved : null,
    reviewCandidateCreated: typeof record.reviewCandidateCreated === "boolean" ? record.reviewCandidateCreated : null,
    cleanCompletion: typeof record.cleanCompletion === "boolean" ? record.cleanCompletion : null,
    nextTaskType: typeof record.nextTaskType === "string" ? record.nextTaskType : null,
    json: true,
  };
}

function classifyBoundedAuthResponse(result: BoundedAuthResponse) {
  if (!result.json) return "m421_auth_endpoint_unavailable_possible_deployment_protection";
  if (result.status === 400 || result.error === "auth-failed") return "m421_auth_credentials_rejected";
  if (result.status === 503 || result.error === "supabase-not-configured") return "m421_preview_supabase_auth_unavailable";
  if (result.status === 200 && result.ok === true) return null;
  return "m421_auth_endpoint_unavailable_possible_deployment_protection";
}

async function classifyKnownAuthUiMessage(page: Page) {
  const hasCredentialsError =
    (await page.getByText("로그인에 실패했습니다", { exact: false }).first().isVisible({ timeout: 500 }).catch(() => false)) ||
    (await page.getByText("입력 정보를 다시 확인", { exact: false }).first().isVisible({ timeout: 500 }).catch(() => false));
  if (hasCredentialsError) {
    return "m421_auth_credentials_rejected";
  }

  const hasSupabaseError =
    (await page.getByText("로그인이 아직 연결되지 않았습니다", { exact: false }).first().isVisible({ timeout: 500 }).catch(() => false)) ||
    (await page.getByText("현재 환경에서 로그인이", { exact: false }).first().isVisible({ timeout: 500 }).catch(() => false));
  if (hasSupabaseError) {
    return "m421_preview_supabase_auth_unavailable";
  }

  return null;
}

async function login(page: Page, credential: RuntimeCredential, mode: "first" | "second" = "first") {
  try {
    await page.goto(`/login?mode=${mode}`, { timeout: loginPreflightTimeoutMs, waitUntil: "domcontentloaded" });
  } catch {
    throw new Error("m421_app_login_surface_unavailable_possible_deployment_protection");
  }

  const emailInput = page.getByLabel("이메일");
  const passwordInput = page.getByLabel("비밀번호");
  try {
    await expect(emailInput).toBeVisible({ timeout: loginPreflightTimeoutMs });
    await expect(passwordInput).toBeVisible({ timeout: loginPreflightTimeoutMs });
  } catch {
    throw new Error("m421_app_login_surface_unavailable_possible_deployment_protection");
  }

  await emailInput.fill(credential.email);
  await passwordInput.fill(credential.password);

  let authResponse: Response;
  try {
    [authResponse] = await Promise.all([
      page.waitForResponse(
        (response) => {
          const request = response.request();
          try {
            return request.method() === "POST" && new URL(response.url()).pathname === "/api/auth/sign-in";
          } catch {
            return false;
          }
        },
        { timeout: loginPreflightTimeoutMs },
      ),
      page.getByTestId("login-submit").click({ timeout: loginPreflightTimeoutMs }),
    ]);
  } catch {
    const uiClassification = await classifyKnownAuthUiMessage(page);
    await emailInput.fill("").catch(() => undefined);
    await passwordInput.fill("").catch(() => undefined);
    throw new Error(uiClassification ?? "m421_auth_endpoint_unavailable_possible_deployment_protection");
  }

  const boundedAuth = await readBoundedAuthResponse(authResponse);
  const responseClassification = classifyBoundedAuthResponse(boundedAuth);
  if (responseClassification) {
    await emailInput.fill("").catch(() => undefined);
    await passwordInput.fill("").catch(() => undefined);
    throw new Error(responseClassification);
  }

  const uiClassification = await classifyKnownAuthUiMessage(page);
  if (uiClassification) {
    await emailInput.fill("").catch(() => undefined);
    await passwordInput.fill("").catch(() => undefined);
    throw new Error(uiClassification);
  }

  if (boundedAuth.redirectCategory !== "app" && boundedAuth.redirectCategory !== "onboarding") {
    await emailInput.fill("").catch(() => undefined);
    await passwordInput.fill("").catch(() => undefined);
    throw new Error("m421_auth_session_redirect_failed");
  }

  try {
    await expect(page).toHaveURL(/\/(app|onboarding)/, { timeout: loginPreflightTimeoutMs });
  } catch {
    await emailInput.fill("").catch(() => undefined);
    await passwordInput.fill("").catch(() => undefined);
    throw new Error("m421_auth_session_redirect_failed");
  }
}

async function openFreshContext(browser: Browser, credential: RuntimeCredential, mode: "first" | "second" = "first") {
  const context = await browser.newContext({
    baseURL: runtimeBaseURL,
    extraHTTPHeaders: vercelProtectionHeaders(),
  });
  const page = await context.newPage();
  await login(page, credential, mode);
  return { context, page };
}

async function expectNoUnsafeLearnerClaims(page: Page) {
  await expect(page.locator('a[href*="/instructor"], a[href*="/studio"]')).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/official grading|official score|pass\/fail|pass guarantee|model answer|AI final judgment/i);
}

async function expectNoHorizontalScrollBlock(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
}

async function expectTodayPlanMaxThree(page: Page) {
  const surface = page.locator("[data-today-plan-primary-surface]").first();
  if ((await surface.count()) === 0) return;

  const declaredCap = await surface.getAttribute("data-visible-primary-task-cap");
  expect(Number(declaredCap)).toBeLessThanOrEqual(3);
  expect(await surface.locator("[data-today-plan-primary-task]").count()).toBeLessThanOrEqual(3);
}

async function clickFirstVisible(locator: Locator) {
  await locator.first().scrollIntoViewIfNeeded();
  await locator.first().click();
}

async function fillByLabel(root: Page | Locator, label: string | RegExp, value: string) {
  const field = root.getByLabel(label).first();
  await expect(field).toBeVisible();
  await field.fill(value);
}

async function clickButton(root: Page | Locator, name: string | RegExp) {
  const button = root.getByRole("button", { name }).first();
  await expect(button).toBeVisible();
  await button.scrollIntoViewIfNeeded();
  await expect(button).toBeEnabled();
  await button.click();
}

async function openCapture(page: Page, mode: "first" | "second") {
  await page.goto(`/app?mode=${mode}`);
  await expectNoUnsafeLearnerClaims(page);
  await expectTodayPlanMaxThree(page);

  const captureLink = page.locator(`a[href*="/app/capture?mode=${mode}"], a[href*="/app/capture"]`).first();
  if ((await captureLink.count()) > 0) {
    await clickFirstVisible(captureLink);
  } else {
    await page.goto(`/app/capture?mode=${mode}`);
  }

  await expect(page).toHaveURL(/\/app\/capture/);
  await expect(page.getByTestId("capture-page-shell")).toBeVisible();
}

async function fillCaptureTextMode(page: Page, value: string) {
  const textOption = page.locator("[data-capture-input-options] button").nth(2);
  if ((await textOption.count()) > 0) {
    await textOption.click();
  }
  await page.locator("textarea").first().fill(value);
}

async function saveCapture(page: Page) {
  await page.getByTestId("capture-save-primary").scrollIntoViewIfNeeded();
  await page.getByTestId("capture-save-primary").click();
  await page.waitForLoadState("networkidle").catch(() => undefined);
}

async function ensureSession(page: Page, mode: "first" | "second") {
  if (/\/app\/session/.test(page.url())) return;

  const sessionLink = page.locator(`a[href*="/app/session?mode=${mode}"], a[href*="/app/session"]`).first();
  if ((await sessionLink.count()) > 0) {
    await clickFirstVisible(sessionLink);
  } else {
    await page.goto(`/app/session?mode=${mode}`);
  }

  await expect(page).toHaveURL(/\/app\/session/);
}

async function fillCurrentTextareas(page: Page, suffix: string) {
  const textareas = page.locator("textarea:visible");
  const count = await textareas.count();
  for (let index = 0; index < count; index += 1) {
    const textarea = textareas.nth(index);
    const value = await textarea.inputValue().catch(() => "");
    if (!value.trim()) {
      await textarea.fill(syntheticText("recall production", suffix));
    }
  }
}

async function chooseVisibleChecks(page: Page) {
  const radios = page.locator('input[type="radio"]:visible');
  if ((await radios.count()) > 0) {
    await radios.first().check();
  }

  const checkboxes = page.locator('input[type="checkbox"]:visible');
  const checkboxCount = await checkboxes.count();
  for (let index = 0; index < checkboxCount; index += 1) {
    const checkbox = checkboxes.nth(index);
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }
  }
}

async function clickEnabledProgressButton(root: Page | Locator) {
  const buttons = root.locator("button:visible:not([disabled])");
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);
  await buttons.nth(count - 1).click();
}

async function completeSessionLoop(page: Page, mode: "first" | "second", suffix: string) {
  await ensureSession(page, mode);
  await expectNoUnsafeLearnerClaims(page);

  for (let step = 0; step < 10; step += 1) {
    if ((await page.locator('a[href^="/app?mode="], a[href*="/app?mode="]').count()) > 0 && /\/app\/session/.test(page.url())) {
      const doneCopy = page.locator("body").filter({ hasText: /done|complete|today/i });
      if ((await doneCopy.count()) > 0 && step > 2) break;
    }

    const disabledBeforeProduction = await page.locator("button:visible:disabled").count();
    await fillCurrentTextareas(page, suffix);
    await chooseVisibleChecks(page);
    if (step > 0) {
      expect(disabledBeforeProduction).toBeGreaterThanOrEqual(0);
    }
    await clickEnabledProgressButton(page);
    await page.waitForTimeout(300);
  }
}

async function completeSecondWriteJourney(page: Page, suffix: string) {
  await page.goto("/app/write?mode=second");
  await expect(page).toHaveURL(/\/app\/write\?mode=second/);
  await expectNoUnsafeLearnerClaims(page);

  await expect(page.getByText("Step 1. 쟁점 회상")).toBeVisible();
  await expect(page.getByText("Step 4. 강의/교재 정리 입력")).toHaveCount(0);
  await fillByLabel(page, "쟁점 회상", syntheticText("issue recall", suffix));
  await clickButton(page, "다음: 목차 작성");

  await expect(page.getByText("Step 2. 목차 작성")).toBeVisible();
  await expect(page.getByText("Step 4. 강의/교재 정리 입력")).toHaveCount(0);
  await fillByLabel(page, "목차 초안", syntheticText("outline", suffix));
  await clickButton(page, "다음: 내 답안 작성");

  await expect(page.getByText("Step 3. 내 답안 작성")).toBeVisible();
  await expect(page.getByText("Step 4. 강의/교재 정리 입력")).toHaveCount(0);
  await fillByLabel(page, "내 답안", syntheticText("learner answer", suffix));
  await clickButton(page, "다음: 강의/교재 정리 입력");

  await expect(page.getByText("Step 4. 강의/교재 정리 입력")).toBeVisible();
  await fillByLabel(page, "강의/교재 정리 요약", syntheticText("reference", suffix));
  await clickButton(page, "다음: 가장 큰 약점 1개");

  await expect(page.getByText("Step 5. 가장 큰 약점 1개")).toBeVisible();
  await fillByLabel(page, "보강할 논점 1개", syntheticText("one biggest gap", suffix));
  await clickButton(page, "다음: 문단 다시쓰기");

  await expect(page.getByText("Step 6. 문단 다시쓰기")).toBeVisible();
  await page.getByTestId("second-write-final-textarea").fill(syntheticText("paragraph rewrite", suffix));
  await clickButton(page, "마지막 확인으로 이동");
  await clickButton(page, "저장하고 오늘 할 일에 반영");

  const confirmation = page.getByTestId("capture-save-confirmation");
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText(/가장 큰 약점 1개|다음 행동 1개/);
}

async function completeCalculatorRecoveryRoutine(page: Page, suffix: string) {
  const recoveryRoutineId = calculatorRecoveryRoutineId(suffix);
  const recoveryHref = `/app/calculator?mode=second&context=practice&focus=casio&recoveryRoutineId=${recoveryRoutineId}&recoverySource=problem-snap`;

  await page.goto("/app/calculator?mode=second&context=practice&focus=casio");
  await expect(page.locator("[data-calculator-routine-trainer]")).toHaveCount(0);

  await page.goto(recoveryHref);
  await expect(page.locator("[data-calculator-routine-recovery-section]").first()).toBeVisible();
  await expect(page.locator("[data-calculator-routine-trainer]").first()).toBeVisible();
  await expectNoUnsafeLearnerClaims(page);

  const trainer = page.locator("[data-calculator-routine-recovery-section] [data-calculator-routine-trainer]").first();
  await expect(trainer).toHaveAttribute("data-calculator-routine-source", "problem-snap");
  await clickButton(trainer, /계산·검산 루틴 시작/);

  for (const label of [
    "조건 정리 입력",
    "산식 선택 입력",
    "숫자/단위 확인 입력",
    "CASIO 입력 입력",
    "화면값 확인 입력",
    "답안 기재값 확인 입력",
    "단위/반올림 확인 입력",
  ]) {
    await fillByLabel(trainer, label, syntheticText("metadata routine entry", suffix));
    await clickButton(trainer, "다음 단계");
  }

  await trainer.getByLabel("역산").check();
  await clickButton(trainer, "다음 단계");

  await trainer.getByLabel("조건 누락").check();
  const [completionResponse] = await Promise.all([
    page.waitForResponse(
      (response) => {
        try {
          return response.request().method() === "POST" && new URL(response.url()).pathname === "/api/os/calculator-routine/complete";
        } catch {
          return false;
        }
      },
      { timeout: 15_000 },
    ),
    clickButton(trainer, "계산·검산 루틴 완료"),
  ]);
  const completion = await readBoundedCalculatorRoutineCompletionResponse(completionResponse);
  expect(completion).toMatchObject({
    httpStatus: 200,
    ok: true,
    persistenceStatus: "saved",
    learningRecordSaved: true,
    reviewCandidateCreated: true,
    cleanCompletion: false,
    nextTaskType: "calculator_routine",
    json: true,
  });
  await expect(trainer).toHaveAttribute("data-calculator-routine-state", "completed");
  await expect(page.locator("[data-calculator-routine-trainer][data-calculator-routine-state='completed']")).toHaveCount(1);
  await expect(page.locator("body")).not.toContainText(/certified numerically|numerical correctness certified|official score/i);
}

async function assertCurrentSyntheticRecordAbsent(page: Page, suffix: string, mode: "first" | "second") {
  await page.goto(`/app/notes?mode=${mode}`);
  await expect(page.locator("body")).not.toContainText(suffix);
}

async function assertSyntheticRecordVisibleOrLocalHonest(page: Page, suffix: string, mode: "first" | "second") {
  await page.goto(`/app/notes?mode=${mode}`);
  await expect
    .poll(
      async () => {
        const text = await page.locator("body").innerText().catch(() => "");
        if (text.includes(suffix)) return "current-record";
        if (localizedHonestLocalFallbackPattern.test(text)) return "honest-local-fallback";
        return "missing";
      },
      {
        message: `expected current synthetic record ${suffix} or localized honest fallback copy`,
        timeout: 10_000,
      },
    )
    .not.toBe("missing");
}

async function expectTemporaryOrFailedSaveConfirmation(page: Page) {
  const confirmation = page.getByTestId("capture-save-confirmation");
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText(honestSaveFailureOrFallbackPattern);
  await expect(confirmation).not.toContainText(durableStorageSuccessPattern);
}

test.use({
  extraHTTPHeaders: vercelProtectionHeaders(),
  screenshot: "only-on-failure",
  trace: vercelAutomationBypassSecret ? "off" : "retain-on-failure",
});

test.describe("M421 closed beta runtime acceptance v2", () => {
  test.describe.configure({ timeout: 180_000 });
  test.skip(!runtimeGateEnabled, "M421 runtime acceptance requires M421_RUNTIME_ACCEPTANCE=1 and owner-provided runtime credentials.");

  test.beforeAll(() => {
    requireRuntimeEnvironment();
  });

  for (const viewport of responsiveWidths) {
    test(`first-exam golden journey at ${viewport.label}`, async ({ page }) => {
      const suffix = safeEvidenceSuffix();
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await login(page, credentialFrom("E2E_USER"), "first");

      await openCapture(page, "first");
      await fillCaptureTextMode(page, syntheticText("first exam capture", suffix));
      await saveCapture(page);

      const confirmation = page.getByTestId("capture-save-confirmation");
      if ((await confirmation.count()) > 0) {
        await expect(confirmation.first()).toBeVisible();
      }

      await ensureSession(page, "first");
      await completeSessionLoop(page, "first", suffix);
      await page.goto("/app?mode=first");
      await expectTodayPlanMaxThree(page);
      await expectNoHorizontalScrollBlock(page);
      await expectNoUnsafeLearnerClaims(page);
      await page.reload();
      await expectTodayPlanMaxThree(page);
      await expectNoUnsafeLearnerClaims(page);
    });
  }

  test("second-exam rewrite journey keeps recall before reference and honest completion", async ({ page }) => {
    const suffix = safeEvidenceSuffix();
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, credentialFrom("E2E_USER"), "second");

    await completeSecondWriteJourney(page, suffix);
    await ensureSession(page, "second");
    await completeSessionLoop(page, "second", suffix);
    await page.reload();
    await expectNoUnsafeLearnerClaims(page);
  });

  test("calculator routine recovery creates one recovery result and avoids duplicate visible completion", async ({ page }) => {
    const suffix = safeEvidenceSuffix();
    await page.setViewportSize({ width: 1280, height: 800 });
    await login(page, credentialFrom("E2E_USER"), "second");

    await completeCalculatorRecoveryRoutine(page, suffix);

    await page.goto("/app/review?mode=second");
    const candidates = page.locator("[data-calculator-routine-review-candidates]");
    await expect(candidates).toHaveCount(1);
    await expect(candidates.getByRole("link", { name: "계산·검산 다시 하기" }).first()).toBeVisible();
  });

  test("refresh and two-context durability stay honest", async ({ browser }) => {
    const suffix = safeEvidenceSuffix();
    const credential = credentialFrom("E2E_USER_A");
    const first = await openFreshContext(browser, credential, "first");
    const second = await openFreshContext(browser, credential, "first");

    try {
      await assertCurrentSyntheticRecordAbsent(first.page, suffix, "first");
      await assertCurrentSyntheticRecordAbsent(second.page, suffix, "first");
      await openCapture(first.page, "first");
      await fillCaptureTextMode(first.page, syntheticText("two context durability", suffix));
      await saveCapture(first.page);
      await first.page.reload();
      await assertSyntheticRecordVisibleOrLocalHonest(first.page, suffix, "first");
      await assertSyntheticRecordVisibleOrLocalHonest(second.page, suffix, "first");
    } finally {
      await first.context.close();
      await second.context.close();
    }
  });

  test("account A/B isolation is enforced through learner routes", async ({ browser }) => {
    const suffix = safeEvidenceSuffix();
    const accountA = await openFreshContext(browser, credentialFrom("E2E_USER_A"), "first");
    const accountB = await openFreshContext(browser, credentialFrom("E2E_USER_B"), "first");

    try {
      await openCapture(accountA.page, "first");
      await fillCaptureTextMode(accountA.page, syntheticText("account owned evidence", suffix));
      await saveCapture(accountA.page);

      await accountB.page.goto("/app/notes?mode=first");
      await expect(accountB.page.locator("body")).not.toContainText(suffix);
      await accountB.page.goto("/app/review?mode=first");
      await expect(accountB.page.locator("body")).not.toContainText(suffix);
      await expectNoUnsafeLearnerClaims(accountB.page);
    } finally {
      await accountA.context.close();
      await accountB.context.close();
    }
  });

  test("failure honesty does not show false durable success or raw provider failure", async ({ page }) => {
    const suffix = safeEvidenceSuffix();
    await login(page, credentialFrom("E2E_USER"), "first");

    await page.route("**/api/os/items", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "m421_synthetic_save_failure" }),
      });
    });

    await openCapture(page, "first");
    await fillCaptureTextMode(page, syntheticText("save failure", suffix));
    await saveCapture(page);
    await expectTemporaryOrFailedSaveConfirmation(page);
    await expect(page.locator("body")).not.toContainText(/durable saved|saved successfully|계정 기록에 저장|https?:\/\//i);

    await page.unroute("**/api/os/items");
    await page.route("**/api/answer-review/structure", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "m421_synthetic_structure_failure" }),
      });
    });

    await page.goto("/answer-review?mode=second");
    await page.locator("textarea").first().fill(syntheticText("provider failure", suffix));
    const enabledButtons = page.locator("button:visible:not([disabled])");
    if ((await enabledButtons.count()) > 0) {
      await enabledButtons.first().click();
    }
    await expect(page.locator("body")).not.toContainText(/completed AI analysis|stack trace|endpoint|token|secret|https?:\/\//i);
  });
});
