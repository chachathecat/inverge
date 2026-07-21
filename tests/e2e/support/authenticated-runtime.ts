import {
  expect,
  type Locator,
  type Page,
  type Request,
  type Response,
  type TestInfo,
} from "@playwright/test";

export const runtimeBaseUrl = process.env.E2E_BASE_URL?.trim() ?? "";
export const runtimeTargetSha = process.env.E2E_TARGET_SHA?.trim() ?? "";
export const runtimeRunnerSha = process.env.E2E_RUNNER_SHA?.trim() ?? "";
const expectedRuntimeHost =
  process.env.E2E_EXPECTED_HOST?.trim().toLowerCase() ?? "";

const testEmail = process.env.E2E_USER_EMAIL?.trim() ?? "";
const testPassword = process.env.E2E_USER_PASSWORD ?? "";
const vercelBypassSecret =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ?? "";

export const protectionHeaders: Record<string, string> = vercelBypassSecret
  ? {
      "x-vercel-protection-bypass": vercelBypassSecret,
      "x-vercel-set-bypass-cookie": "true",
    }
  : {};

export async function establishProtectedPreviewSession(
  page: Page,
  suiteLabel: string,
) {
  const previewUrl = new URL(runtimeBaseUrl);
  if (!previewUrl.hostname.toLowerCase().endsWith(".vercel.app")) return;
  if (
    previewUrl.protocol !== "https:" ||
    (expectedRuntimeHost &&
      previewUrl.hostname.toLowerCase() !== expectedRuntimeHost)
  ) {
    throw new Error(
      `${suiteLabel} Vercel protection bootstrap target is not the owner-approved HTTPS Preview.`,
    );
  }
  if (!vercelBypassSecret) {
    throw new Error(
      `${suiteLabel} runtime acceptance requires VERCEL_AUTOMATION_BYPASS_SECRET for a protected Vercel Preview.`,
    );
  }

  const versionUrl = new URL("/api/runtime/version", previewUrl);
  const bootstrapResponse = await page
    .context()
    .request.get(versionUrl.toString(), {
      headers: protectionHeaders,
      maxRedirects: 0,
      timeout: 30_000,
    });
  const bootstrapUrl = new URL(bootstrapResponse.url());
  const bootstrapStatus = bootstrapResponse.status();

  if (bootstrapUrl.origin !== previewUrl.origin) {
    throw new Error(
      `${suiteLabel} Vercel protection bootstrap left the approved Preview origin.`,
    );
  }
  let cookieProofTarget = versionUrl;
  if (bootstrapStatus !== 200) {
    const cookieRedirectStatuses = new Set([301, 302, 303, 307, 308]);
    const bootstrapHeaders = bootstrapResponse.headers();
    const setCookieHeaders = bootstrapResponse
      .headersArray()
      .filter(({ name }) => name.toLowerCase() === "set-cookie");
    const location = bootstrapHeaders["location"];
    if (
      !cookieRedirectStatuses.has(bootstrapStatus) ||
      !location ||
      setCookieHeaders.length < 1
    ) {
      throw new Error(
        `${suiteLabel} Vercel protection bootstrap returned HTTP ${bootstrapStatus} without a valid cookie redirect.`,
      );
    }

    const redirectUrl = new URL(location, versionUrl);
    const encodedSecret = encodeURIComponent(vercelBypassSecret);
    if (
      redirectUrl.origin !== previewUrl.origin ||
      redirectUrl.pathname !== versionUrl.pathname ||
      redirectUrl.search !== versionUrl.search ||
      redirectUrl.hash !== versionUrl.hash ||
      redirectUrl.username !== "" ||
      redirectUrl.password !== "" ||
      redirectUrl.href.includes(vercelBypassSecret) ||
      redirectUrl.href.includes(encodedSecret)
    ) {
      throw new Error(
        `${suiteLabel} Vercel protection bootstrap returned an unsafe redirect target.`,
      );
    }

    const setCookieNames = new Set(
      setCookieHeaders
        .map(({ value }) => {
          const separator = value.indexOf("=");
          return separator > 0 ? value.slice(0, separator).trim() : "";
        })
        .filter(Boolean),
    );
    const storedBypassCookie = (
      await page.context().cookies(versionUrl.toString())
    ).find((cookie) => setCookieNames.has(cookie.name));
    if (
      !storedBypassCookie ||
      storedBypassCookie.domain.replace(/^\./, "").toLowerCase() !==
        previewUrl.hostname.toLowerCase() ||
      storedBypassCookie.path !== "/" ||
      !storedBypassCookie.secure ||
      !storedBypassCookie.httpOnly
    ) {
      throw new Error(
        `${suiteLabel} Vercel protection bootstrap did not install a safely scoped cookie.`,
      );
    }
    cookieProofTarget = redirectUrl;
  }

  // APIRequestContext shares cookies with this BrowserContext. The redirect response
  // installs the bypass cookie; prove it works with a second same-origin request that
  // deliberately carries no protection secret header.
  const cookieProofResponse = await page
    .context()
    .request.get(cookieProofTarget.toString(), {
      maxRedirects: 0,
      timeout: 30_000,
    });
  const observedCookieProofUrl = new URL(cookieProofResponse.url());
  if (
    observedCookieProofUrl.origin !== previewUrl.origin ||
    cookieProofResponse.status() !== 200
  ) {
    throw new Error(
      `${suiteLabel} Vercel protection cookie proof returned HTTP ${cookieProofResponse.status()}.`,
    );
  }
}

type RuntimeSafetyOptions = {
  requireTargetSha?: boolean;
  requireExactHead?: boolean;
};

export type RuntimeErrors = {
  consoleErrors: string[];
  pageErrors: string[];
  sameOriginRequestFailures: string[];
};

export function requireSafeAuthenticatedRuntime(
  suiteLabel: string,
  options: RuntimeSafetyOptions = {},
) {
  const missing = [
    ["E2E_BASE_URL", runtimeBaseUrl],
    ["E2E_USER_EMAIL", testEmail],
    ["E2E_USER_PASSWORD", testPassword],
    ...(options.requireExactHead
      ? ([
          ["E2E_RUNNER_SHA", runtimeRunnerSha],
          ["E2E_TARGET_SHA", runtimeTargetSha],
        ] as const)
      : []),
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `${suiteLabel} runtime acceptance missing required env: ${missing.join(", ")}`,
    );
  }

  const url = new URL(runtimeBaseUrl);
  const host = url.hostname.toLowerCase();
  const productionHosts = new Set([
    "inverge.vercel.app",
    "inverge.ai",
    "www.inverge.ai",
    "inverge.app",
    "www.inverge.app",
  ]);

  if (productionHosts.has(host)) {
    throw new Error(
      `${suiteLabel} runtime acceptance refuses production. Use an approved non-production Preview or staging URL.`,
    );
  }

  if (url.protocol !== "https:") {
    throw new Error(
      `${suiteLabel} runtime acceptance requires an HTTPS target.`,
    );
  }

  if (expectedRuntimeHost && host !== expectedRuntimeHost) {
    throw new Error(
      `${suiteLabel} runtime acceptance target host does not match the owner-approved Preview.`,
    );
  }

  if (host.endsWith(".vercel.app") && !vercelBypassSecret) {
    throw new Error(
      `${suiteLabel} runtime acceptance requires VERCEL_AUTOMATION_BYPASS_SECRET for a protected Vercel Preview.`,
    );
  }

  if (options.requireTargetSha && !/^[0-9a-f]{40}$/i.test(runtimeTargetSha)) {
    throw new Error(
      `${suiteLabel} runtime acceptance requires E2E_TARGET_SHA as the exact 40-character deployment commit.`,
    );
  }

  if (options.requireExactHead) {
    if (!/^[0-9a-f]{40}$/i.test(runtimeRunnerSha)) {
      throw new Error(
        `${suiteLabel} runtime acceptance requires E2E_RUNNER_SHA as the full current PR head.`,
      );
    }
    if (runtimeTargetSha !== runtimeRunnerSha) {
      throw new Error(
        `${suiteLabel} runtime acceptance requires the deployment target SHA to equal the runner head SHA.`,
      );
    }
  }
}

export function sanitizeRuntimeEvidence(value: string) {
  let sanitized = value;
  if (testEmail)
    sanitized = sanitized.replaceAll(testEmail, "[redacted-email]");
  if (testPassword)
    sanitized = sanitized.replaceAll(testPassword, "[redacted-password]");
  if (vercelBypassSecret)
    sanitized = sanitized.replaceAll(vercelBypassSecret, "[redacted-bypass]");
  if (runtimeBaseUrl)
    sanitized = sanitized.replaceAll(runtimeBaseUrl, "[redacted-runtime-url]");
  return sanitized;
}

function isSignInRequest(candidate: Request) {
  const url = new URL(candidate.url());
  return candidate.method() === "POST" && url.pathname === "/api/auth/sign-in";
}

function isSignInResponse(candidate: Response) {
  return isSignInRequest(candidate.request());
}

export type ExplicitTestCredential = Readonly<{
  email: string;
  password: string;
}>;

async function waitForHydratedLoginForm(
  page: Page,
  credential: ExplicitTestCredential,
) {
  const emailInput = page.getByLabel("이메일");
  const passwordInput = page.getByLabel("비밀번호");
  const submit = page.getByTestId("login-submit");

  await expect(emailInput).toBeVisible({ timeout: 20_000 });
  await expect(passwordInput).toBeVisible({ timeout: 20_000 });
  await expect(submit).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(
      () =>
        submit.evaluate((element) =>
          Object.keys(element).some(
            (key) =>
              key.startsWith("__reactProps$") ||
              key.startsWith("__reactFiber$"),
          ),
        ),
      {
        timeout: 20_000,
        message: "The login form must be client-hydrated before submission.",
      },
    )
    .toBe(true);

  // Exercise React's controlled handlers with a public sentinel before restoring secrets.
  await emailInput.fill("hydration-check@inverge.invalid");
  await expect(emailInput).toHaveValue("hydration-check@inverge.invalid");
  await emailInput.fill(credential.email);
  await passwordInput.fill(credential.password);
  await expect
    .poll(
      () => emailInput.inputValue().then((value) => value === credential.email),
      {
        timeout: 20_000,
        message:
          "The hydrated email control must retain its secret-backed value.",
      },
    )
    .toBe(true);
  await expect
    .poll(
      () =>
        passwordInput
          .inputValue()
          .then((value) => value === credential.password),
      {
        timeout: 20_000,
        message:
          "The hydrated password control must retain its secret-backed value.",
      },
    )
    .toBe(true);
  await expect(submit).toBeEnabled({ timeout: 20_000 });

  return submit;
}

async function clickForSignInResponse(page: Page, submit: Locator) {
  let requestEmitted = false;
  const observeRequest = (request: Request) => {
    if (isSignInRequest(request)) requestEmitted = true;
  };
  page.on("request", observeRequest);

  try {
    const responsePromise = page
      .waitForResponse(isSignInResponse, { timeout: 20_000 })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "TimeoutError")
          return null;
        throw error;
      });
    await submit.click({ timeout: 20_000 });
    const response = await responsePromise;
    return { requestEmitted, response };
  } finally {
    page.off("request", observeRequest);
  }
}

export async function loginWithDedicatedTestAccount(
  page: Page,
  mode: "first" | "second" = "second",
) {
  return loginWithExplicitTestAccount(
    page,
    { email: testEmail, password: testPassword },
    mode,
  );
}

export async function loginWithExplicitTestAccount(
  page: Page,
  credential: ExplicitTestCredential,
  mode: "first" | "second" = "second",
) {
  if (!credential.email || !credential.password) {
    throw new Error("Explicit test-account credentials are incomplete.");
  }
  await page.goto(`/login?mode=${mode}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  const appSurface = page.locator('[data-s224v-surface="/app"]');
  if (new URL(page.url()).pathname === "/app") {
    await expect(appSurface).toBeVisible({ timeout: 20_000 });
    return { signInAttempts: 0 };
  }

  let signInAttempts = 1;
  let submit = await waitForHydratedLoginForm(page, credential);
  let attempt = await clickForSignInResponse(page, submit);

  // Retry once only when the hydrated click emitted no authentication request.
  if (!attempt.response && !attempt.requestEmitted) {
    signInAttempts += 1;
    submit = await waitForHydratedLoginForm(page, credential);
    attempt = await clickForSignInResponse(page, submit);
  }

  if (!attempt.response) {
    if (attempt.requestEmitted) {
      throw new Error(
        "The sign-in request was emitted but produced no response within the bounded wait; it was not retried.",
      );
    }
    throw new Error(
      "The hydrated login form emitted no sign-in request after one bounded no-request retry.",
    );
  }

  const status = attempt.response.status();
  if ([400, 401, 403].includes(status)) {
    throw new Error(
      `The dedicated test account sign-in returned ${status}; credential failures are not retried.`,
    );
  }
  if (!attempt.response.ok()) {
    throw new Error(
      `The dedicated test account sign-in returned HTTP ${status}.`,
    );
  }

  await expect(page).toHaveURL((url) => url.pathname === "/app", {
    timeout: 20_000,
  });
  await expect(appSurface).toBeVisible({ timeout: 20_000 });
  return { signInAttempts };
}

export function monitorRuntimeErrors(page: Page): RuntimeErrors {
  const errors: RuntimeErrors = {
    consoleErrors: [],
    pageErrors: [],
    sameOriginRequestFailures: [],
  };
  const runtimeOrigin = new URL(runtimeBaseUrl).origin;

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.consoleErrors.push(sanitizeRuntimeEvidence(message.text()));
    }
  });
  page.on("pageerror", (error) => {
    errors.pageErrors.push(sanitizeRuntimeEvidence(error.message));
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    const failure = request.failure()?.errorText ?? "unknown";
    if (url.origin !== runtimeOrigin || failure.includes("ERR_ABORTED")) return;
    errors.sameOriginRequestFailures.push(
      sanitizeRuntimeEvidence(
        request.method() + " " + url.pathname + " " + failure,
      ),
    );
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin !== runtimeOrigin || response.status() < 400) return;
    errors.sameOriginRequestFailures.push(
      sanitizeRuntimeEvidence(
        response.request().method() +
          " " +
          url.pathname +
          " HTTP " +
          response.status(),
      ),
    );
  });

  return errors;
}

export async function captureSanitizedScreenshot(
  page: Page,
  testInfo: TestInfo,
  fileName: string,
) {
  const accountIdentitySelector =
    '[data-s224v-learner-mode-entry="second-only"] > span:last-child';
  const accountIdentity = page.locator(accountIdentitySelector);
  await expect(
    accountIdentity,
    "The signed-in identity must be present so screenshot evidence can mask it.",
  ).toHaveCount(1);
  await expect(accountIdentity).toBeVisible();

  const unmaskedVisibleEmailCount = await page
    .locator("body *")
    .evaluateAll((elements, maskedSelector) => {
      const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
      return elements.filter((element) => {
        if (
          !(element instanceof HTMLElement) ||
          element.matches(maskedSelector)
        )
          return false;
        const directText = Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent ?? "")
          .join(" ")
          .trim();
        if (!emailPattern.test(directText)) return false;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none"
        );
      }).length;
    }, accountIdentitySelector);
  expect(
    unmaskedVisibleEmailCount,
    "Every visible email-like identity must be inside the masked account region.",
  ).toBe(0);

  await page.screenshot({
    path: testInfo.outputPath(fileName),
    fullPage: true,
    animations: "disabled",
    mask: [accountIdentity, page.getByText(testEmail, { exact: false })],
    maskColor: "#000000",
  });
  return fileName;
}
