import { expect, type Page, type TestInfo } from "@playwright/test";

export const runtimeBaseUrl = process.env.E2E_BASE_URL?.trim() ?? "";
export const runtimeTargetSha = process.env.E2E_TARGET_SHA?.trim() ?? "";
const expectedRuntimeHost = process.env.E2E_EXPECTED_HOST?.trim().toLowerCase() ?? "";

const testEmail = process.env.E2E_USER_EMAIL?.trim() ?? "";
const testPassword = process.env.E2E_USER_PASSWORD ?? "";
const vercelBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ?? "";

export const protectionHeaders: Record<string, string> = vercelBypassSecret
  ? {
      "x-vercel-protection-bypass": vercelBypassSecret,
      "x-vercel-set-bypass-cookie": "true",
    }
  : {};

type RuntimeSafetyOptions = {
  requireTargetSha?: boolean;
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
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`${suiteLabel} runtime acceptance missing required env: ${missing.join(", ")}`);
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
}

export function sanitizeRuntimeEvidence(value: string) {
  let sanitized = value;
  if (testEmail) sanitized = sanitized.replaceAll(testEmail, "[redacted-email]");
  if (testPassword) sanitized = sanitized.replaceAll(testPassword, "[redacted-password]");
  if (vercelBypassSecret) sanitized = sanitized.replaceAll(vercelBypassSecret, "[redacted-bypass]");
  if (runtimeBaseUrl) sanitized = sanitized.replaceAll(runtimeBaseUrl, "[redacted-runtime-url]");
  return sanitized;
}

export async function loginWithDedicatedTestAccount(
  page: Page,
  mode: "first" | "second" = "second",
) {
  let lastStatus: number | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto(`/login?mode=${mode}`, { waitUntil: "domcontentloaded" });
    if (new URL(page.url()).pathname === "/app") return;

    const emailInput = page.getByLabel("이메일");
    const passwordInput = page.getByLabel("비밀번호");
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);

    const [response] = await Promise.all([
      page.waitForResponse((candidate) => {
        const url = new URL(candidate.url());
        return candidate.request().method() === "POST" && url.pathname === "/api/auth/sign-in";
      }),
      page.getByTestId("login-submit").click(),
    ]);

    lastStatus = response.status();
    if (response.ok()) {
      await expect(page).toHaveURL((url) => url.pathname === "/app");
      return;
    }

    await emailInput.fill("").catch(() => undefined);
    await passwordInput.fill("").catch(() => undefined);
    if (attempt === 0) await page.waitForTimeout(800);
  }

  throw new Error(
    "The app login endpoint rejected the dedicated test account after one bounded retry (HTTP " +
      String(lastStatus ?? "unknown") +
      ").",
  );
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
      sanitizeRuntimeEvidence(request.method() + " " + url.pathname + " " + failure),
    );
  });

  return errors;
}

export async function captureSanitizedScreenshot(
  page: Page,
  testInfo: TestInfo,
  fileName: string,
) {
  await page.screenshot({
    path: testInfo.outputPath(fileName),
    fullPage: true,
    mask: [page.getByText(testEmail, { exact: false })],
  });
  return fileName;
}
