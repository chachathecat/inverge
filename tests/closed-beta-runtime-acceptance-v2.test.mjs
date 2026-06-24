import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

function textOf(value) {
  return Array.isArray(value) ? value.join("\n") : String(value);
}

test("M421 runtime acceptance doc records honest pending and blocked states", async () => {
  const doc = await read("docs/qa/closed-beta-runtime-acceptance-v2.md");

  assert.match(doc, /\*\*M421 NON-PUSH RUNTIME ACCEPTANCE PENDING OWNER E2E\*\*/);
  for (const evidence of [
    "atomic Personal Concept transition runtime",
    "event retry idempotency",
    "stale event rejection",
    "concurrent newer-wins",
    "RPC-only write boundary",
    "direct authenticated INSERT/UPDATE denial",
    "account A/B node RLS",
    "account A/B transition-event RLS",
    "durable graph read smoke",
    "Today Plan max-three durable read",
    "production graph flags remain off",
  ]) {
    assert.ok(doc.includes(evidence), evidence);
  }

  assert.ok(doc.includes("Web Push | BLOCKED — VAPID CONFIGURATION ERROR"));
  assert.ok(doc.includes("Web Push provider delivery | NOT REACHED"));
  assert.ok(doc.includes("OS notification receipt | NOT VERIFIED"));
  assert.ok(doc.includes("click routing | NOT VERIFIED"));
  assert.ok(doc.includes("scheduler | BLOCKED BY VERCEL HOBBY PLAN"));
  assert.ok(doc.includes("PR #423 | remains Draft"));
  assert.doesNotMatch(doc, /production launch approved|paid launch approved|Web Push.*PASS/i);
});

test("Playwright runtime suite is explicitly gated and fail-closed", async () => {
  const spec = await read("tests/e2e/closed-beta-runtime-acceptance-v2.spec.ts");

  assert.ok(spec.includes('process.env.M421_RUNTIME_ACCEPTANCE === "1"'));
  assert.ok(spec.includes("M421_RUNTIME_ACCEPTANCE=1"));
  assert.ok(spec.includes("M421_RUNTIME_ACCEPTANCE_ALLOW_PRODUCTION"));
  assert.ok(spec.includes("VERCEL_AUTOMATION_BYPASS_SECRET"));
  assert.ok(spec.includes("isVercelPreviewBaseUrl"));
  assert.ok(spec.includes("x-vercel-protection-bypass"));
  assert.ok(spec.includes("x-vercel-set-bypass-cookie"));
  assert.ok(spec.includes("extraHTTPHeaders: vercelProtectionHeaders()"));
  for (const envName of [
    "E2E_BASE_URL",
    "E2E_USER_EMAIL",
    "E2E_USER_PASSWORD",
    "E2E_USER_A_EMAIL",
    "E2E_USER_A_PASSWORD",
    "E2E_USER_B_EMAIL",
    "E2E_USER_B_PASSWORD",
  ]) {
    assert.ok(spec.includes(envName), envName);
  }

  assert.ok(spec.includes("requiredEnvNames.filter"));
  assert.ok(spec.includes("isObviousProductionBaseUrl"));
  assert.ok(spec.includes("test.skip(!runtimeGateEnabled"));
});

test("protected Preview login preflight is bounded and trace-safe", async () => {
  const spec = await read("tests/e2e/closed-beta-runtime-acceptance-v2.spec.ts");
  const doc = await read("docs/qa/closed-beta-runtime-acceptance-v2.md");

  assert.ok(spec.includes("loginPreflightTimeoutMs = 10_000"));
  assert.ok(spec.includes('page.getByLabel("이메일")'));
  assert.ok(spec.includes('page.getByLabel("비밀번호")'));
  assert.ok(spec.includes("m421_app_login_surface_unavailable_possible_deployment_protection"));
  assert.ok(spec.includes("trace: vercelAutomationBypassSecret ? \"off\" : \"retain-on-failure\""));
  assert.ok(spec.includes("screenshot: \"only-on-failure\""));
  assert.ok(spec.includes("test.describe.configure({ timeout: 180_000 })"));
  assert.ok(doc.includes("failed 8/8 before reaching the Inverge app login form"));
  assert.ok(doc.includes("not learner-loop runtime evidence"));
  assert.ok(doc.includes("owner rerun remains required"));
});

test("login helper classifies bounded auth POST outcomes without recording secrets", async () => {
  const spec = await read("tests/e2e/closed-beta-runtime-acceptance-v2.spec.ts");
  const doc = await read("docs/qa/closed-beta-runtime-acceptance-v2.md");
  const combined = textOf([spec, doc]);

  assert.ok(spec.includes("page.waitForResponse"));
  assert.ok(spec.includes("/api/auth/sign-in"));
  assert.ok(spec.includes("readBoundedAuthResponse"));
  assert.ok(spec.includes("classifyBoundedAuthResponse"));
  assert.ok(spec.includes("classifyKnownAuthUiMessage"));
  assert.ok(spec.includes("response.status()"));
  assert.ok(spec.includes("record.ok"));
  assert.ok(spec.includes("record.error"));
  assert.ok(spec.includes("categorizeRedirectTo(record.redirectTo)"));

  for (const classification of [
    "m421_auth_credentials_rejected",
    "m421_preview_supabase_auth_unavailable",
    "m421_auth_endpoint_unavailable_possible_deployment_protection",
    "m421_auth_session_redirect_failed",
    "m421_app_login_surface_unavailable_possible_deployment_protection",
  ]) {
    assert.ok(combined.includes(classification), classification);
  }

  assert.ok(doc.includes("reached the real Inverge application login surface: PASS"));
  assert.ok(doc.includes("Exact auth/session classification remains pending owner rerun"));
  assert.ok(doc.includes("not learner-loop journey failure evidence"));
  assert.doesNotMatch(combined, /response\.text\(|innerHTML|outerHTML|\.(?:headers|allHeaders|cookies)\(|storageState/i);
});

test("required acceptance journeys and widths are represented", async () => {
  const spec = await read("tests/e2e/closed-beta-runtime-acceptance-v2.spec.ts");
  const combined = textOf([spec, await read("docs/qa/closed-beta-runtime-acceptance-v2.md")]);

  for (const token of [
    "first-exam golden journey",
    "second-exam rewrite journey",
    "calculator routine recovery",
    "refresh and two-context durability",
    "account A/B isolation",
    "failure honesty",
    "360 x 800",
    "390 x 844",
    "1280 x 800",
    "data-visible-primary-task-cap",
    "data-calculator-routine-trainer",
    "capture-save-primary",
    "capture-save-confirmation",
  ]) {
    assert.ok(combined.includes(token), token);
  }
});

test("new acceptance artifacts do not commit raw fixture content or secret-bearing evidence", async () => {
  const spec = await read("tests/e2e/closed-beta-runtime-acceptance-v2.spec.ts");
  const doc = await read("docs/qa/closed-beta-runtime-acceptance-v2.md");
  const combined = textOf([spec, doc]);

  assert.match(spec, /syntheticText/);
  assert.match(spec, /safeEvidenceSuffix/);
  assert.doesNotMatch(combined, /p256dh|SUPABASE_SERVICE_ROLE_KEY|VAPID_PRIVATE_KEY|CRON_SECRET|storageState|access token|refresh token|bypass secret value/i);
  assert.doesNotMatch(combined, /official problem fixture|raw learner fixture|actual formula fixture|calculator keystroke fixture|display reading fixture/i);
  assert.doesNotMatch(combined, /provider body|database row body|user id:/i);
});

test("package script runs only the gated M421 acceptance spec and is not default CI", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  const script = packageJson.scripts?.["test:e2e:m421-runtime-acceptance"];

  assert.equal(script, "playwright test tests/e2e/closed-beta-runtime-acceptance-v2.spec.ts");
  assert.equal(packageJson.scripts.test.includes("closed-beta-runtime-acceptance-v2.spec.ts"), false);
  assert.equal(packageJson.scripts["verify:learner-loop:ci"].includes("closed-beta-runtime-acceptance-v2.spec.ts"), false);
  assert.equal(packageJson.scripts["check:closed-beta-readiness"].includes("closed-beta-runtime-acceptance-v2.spec.ts"), false);
});
