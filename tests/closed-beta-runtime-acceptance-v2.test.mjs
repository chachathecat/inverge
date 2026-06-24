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
  assert.doesNotMatch(combined, /p256dh|SUPABASE_SERVICE_ROLE_KEY|VAPID_PRIVATE_KEY|CRON_SECRET|storageState|access token|refresh token/i);
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
