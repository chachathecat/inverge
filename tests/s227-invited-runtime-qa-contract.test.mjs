import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("S227 and S228 reuse one safe authenticated credential boundary", () => {
  const helper = read("tests/e2e/support/authenticated-runtime.ts");
  const s227 = read("tests/e2e/s227-invited-runtime-acceptance.spec.ts");
  const s228 = read("tests/e2e/study-ledger-v3-detail.spec.ts");

  assert.match(s227, /from "\.\/support\/authenticated-runtime"/);
  assert.match(s228, /from "\.\/support\/authenticated-runtime"/);
  assert.match(s227, /loginWithDedicatedTestAccount/);
  assert.match(s228, /loginWithDedicatedTestAccount/);
  assert.match(s227, /requireSafeAuthenticatedRuntime\("S227", \{ requireTargetSha: true \}\)/);
  assert.match(s228, /requireSafeAuthenticatedRuntime\("S228"\)/);
  assert.match(helper, /runtime acceptance refuses production/);
  assert.match(helper, /VERCEL_AUTOMATION_BYPASS_SECRET/);
  assert.match(helper, /E2E_EXPECTED_HOST/);
  assert.match(helper, /lastStatus === 429/);
  assert.match(helper, /data-s224v-surface="\\/app"/);
  assert.match(helper, /E2E_TARGET_SHA as the exact 40-character deployment commit/);
  assert.match(helper, /\[redacted-email\]/);
  assert.match(helper, /\[redacted-password\]/);
  assert.match(helper, /\[redacted-bypass\]/);
  assert.match(helper, /\[redacted-runtime-url\]/);
  assert.doesNotMatch(s227, /process\.env\.E2E_USER_PASSWORD/);
  assert.doesNotMatch(s227, /process\.env\.E2E_USER_EMAIL/);
  assert.doesNotMatch(s228, /process\.env\.E2E_USER_PASSWORD/);
  assert.doesNotMatch(s228, /process\.env\.E2E_USER_EMAIL/);
});

test("S227 matrix covers the durable second-round learner loop without product changes", () => {
  const spec = read("tests/e2e/s227-invited-runtime-acceptance.spec.ts");

  for (const route of [
    "/app?mode=second",
    "/app/capture?mode=second",
    "/app/notes?mode=second",
    "/app/review?mode=second",
  ]) {
    assert.ok(spec.includes(route), "missing invited-account route: " + route);
  }

  for (const width of ["390", "768", "1440"]) {
    assert.ok(spec.includes(`label: "${width}"`), "missing viewport: " + width);
  }

  assert.match(spec, /comparisonSurvivedReload: true/);
  assert.match(spec, /consoleErrorCount/);
  assert.match(spec, /pageErrorCount/);
  assert.match(spec, /sameOriginRequestFailureCount/);
  assert.match(spec, /syntheticDataOnly: true/);
  assert.match(spec, /traceCaptured: false/);
  assert.match(spec, /data-s226-primary-cta/);
  assert.match(spec, /data-review-primary-surface/);
  assert.match(spec, /data-s228-state="completed"/);
  assert.doesNotMatch(spec, /calculator-routine-trainer/);
});

test("S227 manual workflow is secret-backed, exact-target, and sanitized", () => {
  const workflow = read(".github/workflows/e2e-smoke.yml");

  assert.match(workflow, /s227-invited-runtime/);
  assert.match(workflow, /S227_AUTH_RUNTIME: "1"/);
  assert.match(workflow, /E2E_TARGET_SHA: \$\{\{ inputs\.target_sha \}\}/);
  assert.match(workflow, /secrets\.E2E_USER_EMAIL \|\| secrets\.TEST_USER_EMAIL/);
  assert.match(workflow, /secrets\.E2E_USER_PASSWORD \|\| secrets\.TEST_USER_PASSWORD/);
  assert.match(workflow, /secrets\.VERCEL_AUTOMATION_BYPASS_SECRET/);
  assert.match(workflow, /tests\/e2e\/s227-invited-runtime-acceptance\.spec\.ts/);
  assert.match(workflow, /test-results\/\*\*\/s227-\*\.png/);
  assert.match(workflow, /test-results\/\*\*\/s227-runtime\.json/);

  const s227Job = workflow.split("  s227-invited-account-runtime:")[1] ?? "";
  assert.ok(s227Job, "missing S227 workflow job");
  assert.doesNotMatch(s227Job, /trace\.zip/);
  assert.doesNotMatch(s227Job, /\*\*\/\*\.png/);
});

test("S227 QA document keeps final acceptance blocked until S229 and real evidence", () => {
  const doc = read("docs/qa/s227-invited-account-runtime.md");

  assert.match(doc, /Refs #558/);
  assert.match(doc, /#558 stays open/);
  assert.match(doc, /Blocked by #562/);
  assert.match(doc, /no calculator\/device correctness claim/);
  assert.match(doc, /runner SHA/);
  assert.match(doc, /target deployment SHA/);
  assert.doesNotMatch(doc, /Status: complete/i);
});
