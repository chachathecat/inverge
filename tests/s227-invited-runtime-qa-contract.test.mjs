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
  assert.match(s227, /requireSafeAuthenticatedRuntime\("S227"/);
  assert.match(s227, /requireTargetSha: true/);
  assert.match(s227, /requireExactHead: true/);
  assert.match(s228, /requireSafeAuthenticatedRuntime\("S228"\)/);
  assert.match(helper, /runtime acceptance refuses production/);
  assert.match(helper, /VERCEL_AUTOMATION_BYPASS_SECRET/);
  assert.match(helper, /E2E_EXPECTED_HOST/);
  assert.match(helper, /E2E_RUNNER_SHA/);
  assert.match(helper, /The login form must be client-hydrated before submission/);
  assert.match(helper, /requestEmitted/);
  assert.match(helper, /\[400, 401, 403\]\.includes\(status\)/);
  assert.match(helper, /response\.status\(\) < 400/);
  assert.match(helper, /Every visible email-like identity must be inside the masked account region/);
  assert.ok(helper.includes('data-s224v-surface=\"/app\"'));
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
    "/app/calculator?mode=second&context=practice&focus=casio",
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
  assert.match(spec, /videoCaptured: false/);
  assert.match(spec, /data-s226-primary-cta/);
  assert.match(spec, /data-review-primary-surface/);
  assert.match(spec, /data-s228-state="empty"/);
  assert.match(spec, /data-s228-state="completed"/);
  assert.match(spec, /data-s228-state="error"/);
  assert.match(spec, /data-s228-state="offline"/);
  assert.match(spec, /data-calculator-routine-trainer/);
  assert.match(spec, /data-calculator-routine-active-step/);
  assert.match(spec, /data-calculator-routine-view-state/);
  assert.match(spec, /canonicalStepCount: calculatorStepIds\.length/);
  assert.match(spec, /deviceStatus: "기기 검증 전"/);
  assert.match(spec, /realDeviceVerified: false/);
  assert.match(spec, /normal: viewports\.map/);
  assert.match(spec, /emptyEvidence: viewports\.map/);
  assert.match(spec, /expectedBoundaryFailureCount: viewports\.length/);
  assert.match(spec, /unexpectedBoundaryFailureCount: 0/);
  assert.match(spec, /boundaryContext\.setOffline\(true\)/);
  assert.match(spec, /boundaryContext\.setOffline\(false\)/);
  assert.match(spec, /browser\.newContext/);
  assert.match(spec, /runnerSha: runtimeRunnerSha/);
  assert.match(spec, /targetDeploymentSha: runtimeTargetSha/);
  assert.match(spec, /signInAttempts/);
  assert.match(spec, /retries: 0/);
});

test("S227 dedicated workflow is marker-gated, exact-head, and privacy fail-closed", () => {
  const workflow = read(".github/workflows/s227-runtime.yml");
  const smoke = read(".github/workflows/e2e-smoke.yml");

  assert.match(workflow, /github\.event\.pull_request\.number == 565/);
  assert.match(workflow, /<!-- run-s227-auth-e2e -->/);
  assert.match(workflow, /S227_AUTH_RUNTIME: "1"/);
  assert.ok(
    workflow.includes("E2E_RUNNER_SHA: ${{ github.event.pull_request.head.sha }}"),
    "runner SHA must come from the current PR head",
  );
  assert.ok(
    workflow.includes("E2E_TARGET_SHA: ${{ github.event.pull_request.head.sha }}"),
    "target SHA must come from the current PR head",
  );
  assert.match(workflow, /inverge-git-agent-s227-invited-ru-b0ac61-chachathecats-projects\.vercel\.app/);
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow, /secrets\.E2E_USER_EMAIL \|\| secrets\.TEST_USER_EMAIL/);
  assert.match(workflow, /secrets\.E2E_USER_PASSWORD \|\| secrets\.TEST_USER_PASSWORD/);
  assert.match(workflow, /secrets\.VERCEL_AUTOMATION_BYPASS_SECRET/);
  assert.match(workflow, /tests\/e2e\/s227-invited-runtime-acceptance\.spec\.ts/);
  assert.match(workflow, /apt-get install --yes --no-install-recommends tesseract-ocr/);
  assert.match(workflow, /Reject email-like text in screenshots/);
  assert.match(workflow, /if: always\(\) && steps\.redaction_guard\.outcome == 'success'/);
  assert.match(workflow, /test-results\/\*\*\/s227-\*\.png/);
  assert.match(workflow, /test-results\/\*\*\/s227-runtime\.json/);
  assert.doesNotMatch(smoke, /s227-invited-runtime|S227_AUTH_RUNTIME/);

  const s227Job = workflow.split("  s227-invited-account-runtime:")[1] ?? "";
  assert.ok(s227Job, "missing S227 workflow job");
  assert.doesNotMatch(s227Job, /trace\.zip/);
  assert.doesNotMatch(s227Job, /\*\*\/\*\.png/);
});

test("S227 QA document records the merged dependency and keeps claims evidence-bound", () => {
  const doc = read("docs/qa/s227-invited-account-runtime.md");

  assert.match(doc, /Refs #558/);
  assert.match(doc, /#558 stays open/);
  assert.match(doc, /#562.*merged/i);
  assert.match(doc, /calculator active\/completed/);
  assert.match(doc, /normal\/empty-evidence\/completed\/error\/offline/);
  assert.match(doc, /no calculator\/device correctness claim/);
  assert.match(doc, /runner SHA/);
  assert.match(doc, /target deployment SHA/);
  assert.doesNotMatch(doc, /Status: complete/i);
});
