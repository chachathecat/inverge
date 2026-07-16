import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  S232G_ALIASES,
  S232G_EVIDENCE_KEYS,
  S232G_EXCLUSIONS,
  S232G_FIGMA_FOUNDATION_NODES,
  S232G_FIGMA_SHARED_COMPONENT_NODES,
  S232G_ROUTES,
  S232G_SUMMARY_KEYS,
  S232G_VIEWPORTS,
  buildS232GExpectedEvidenceDescriptors,
  s232gEvidenceCompositeKey,
} from "./support/s232g-contract.mjs";
import {
  validateAndCopyS232GEvidence,
  validateS232GEvidenceValues,
} from "../scripts/validate-s232g-evidence.mjs";

const read = (filePath) => readFileSync(filePath, "utf8");
const runtimeSpec = read("tests/e2e/s232g-final-aggregate-parity.spec.ts");
const reporter = read("tests/e2e/support/s232g-metadata-reporter.ts");
const workflow = read(".github/workflows/s232g-runtime.yml");
const validator = read("scripts/validate-s232g-evidence.mjs");
const qa = read("docs/qa/s232g-final-aggregate-parity.md");
const nodeRunner = read("scripts/run-node-tests.mjs");
const calculatorPage = read("components/review-os/calculator-workflow-page.tsx");
const calculatorTrainer = read("components/review-os/calculator-routine-trainer.tsx");
const weeklyPage = read("app/app/weekly/page.tsx");
const sessionPage = read("app/app/session/page.tsx");
const firstOxRequestedClient = read(
  "components/review-os/first-ox/first-ox-requested-source-client.tsx",
);
const todaySessionRunner = read("components/review-os/today-session-runner.tsx");
const answerReview = read("app/answer-review/answer-review-client.tsx");
const studyLogPage = read("app/app/study-log/page.tsx");

function learnerPageInventory() {
  const pages = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.isFile() && entry.name === "page.tsx") {
        const relativeDirectory = path.relative("app/app", path.dirname(absolute));
        pages.push(relativeDirectory ? `/app/${relativeDirectory}` : "/app");
      }
    }
  };
  walk("app/app");
  pages.push("/answer-review");
  return pages.sort();
}

function buildValidSummary(sha, rowCount) {
  return {
    schemaVersion: 1,
    result: "pass",
    commitSha: sha,
    deploymentSha: sha,
    rowCount,
    canonicalRouteCount: 13,
    aliasCount: 4,
    excludedRouteCount: 6,
    viewportCount: 3,
    axeScanCount: 52,
    axeBlockingCount: 0,
    visibleHeadingCount: 13,
    keyboardRouteCount: 13,
    keyboardFailureCount: 0,
    horizontalOverflowCount: 0,
    nestedTwoDimensionalScrollCount: 0,
    clippedCoreContentCount: 0,
    consoleErrorCount: 0,
    pageErrorCount: 0,
    requestFailureCount: 0,
    httpErrorCount: 0,
    blockedPreviewToolbarMutationCount: 4,
    excludedPreviewToolbarConsoleErrorCount: 4,
    sourceCreatedCount: 1,
    durableSaveReceiptCount: 1,
    reloadComparisonCount: 1,
    notesRoundTripCount: 1,
    freshAccountContextCount: 1,
    crossAccountApiDenialCount: 2,
    crossAccountUiDenialCount: 1,
    crossAccountCollectionAbsenceCount: 3,
    ownerPositiveControlCount: 2,
    stateAnnouncementProxyCount: 1,
    directFigmaProductFrameRouteCount: 1,
    directFigmaComponentOnlyRouteCount: 1,
    semanticComponentOnlyRouteCount: 11,
    actualBrowserZoomClaimed: false,
    realScreenReaderClaimed: false,
    credentialsCaptured: false,
    rawLearnerContentCaptured: false,
    requestBodyCaptured: false,
    responseBodyCaptured: false,
    itemIdCaptured: false,
    userIdCaptured: false,
    emailCaptured: false,
    urlCaptured: false,
    domCaptured: false,
    screenshotCaptured: false,
    traceCaptured: false,
    videoCaptured: false,
  };
}

test("S232G owns, aliases, or explicitly excludes every learner page", () => {
  const inventory = learnerPageInventory();
  const expectedInventory = [
    "/answer-review",
    "/app",
    "/app/acceptance/trust-provenance/[state]",
    "/app/agenda",
    "/app/calculator",
    "/app/capture",
    "/app/entry",
    "/app/first/ox",
    "/app/input",
    "/app/items",
    "/app/items/[itemId]",
    "/app/mode-migration",
    "/app/notes",
    "/app/onboarding",
    "/app/review",
    "/app/session",
    "/app/sets",
    "/app/settings",
    "/app/settings/notifications",
    "/app/study-log",
    "/app/today",
    "/app/weekly",
    "/app/write",
  ].sort();
  assert.deepEqual(inventory, expectedInventory);

  assert.equal(S232G_ROUTES.length, 13);
  assert.equal(S232G_ALIASES.length, 4);
  assert.equal(S232G_EXCLUSIONS.length, 6);
  const dispositions = [
    ...S232G_ROUTES.map((route) => route.pathname),
    ...S232G_ALIASES.map((alias) => alias.pathname),
    ...S232G_EXCLUSIONS.map((exclusion) => exclusion.pathname),
  ].sort();
  assert.deepEqual(dispositions, inventory);
  assert.equal(new Set(dispositions).size, dispositions.length);
  for (const exclusion of S232G_EXCLUSIONS) {
    assert.ok(exclusion.owner.length > 0);
    assert.ok(exclusion.limitation.length > 0);
  }
});

test("S232G registry distinguishes direct frames, direct components, and semantic-only routes", () => {
  assert.deepEqual(S232G_VIEWPORTS.map((viewport) => viewport.key), ["390", "768", "1440"]);
  assert.deepEqual(S232G_FIGMA_FOUNDATION_NODES, ["43:2", "44:9", "45:2", "61:80"]);
  assert.deepEqual(S232G_FIGMA_SHARED_COMPONENT_NODES, ["47:28", "48:75", "50:59", "51:44", "52:42"]);

  const directFrame = S232G_ROUTES.filter((route) => route.parityKind === "direct-product-frame");
  const directComponent = S232G_ROUTES.filter((route) => route.parityKind === "direct-component-only");
  const semanticOnly = S232G_ROUTES.filter((route) => route.parityKind === "semantic-component");
  assert.deepEqual(directFrame.map((route) => route.key), ["study-ledger"]);
  assert.deepEqual(directComponent.map((route) => route.key), ["calculator"]);
  assert.equal(semanticOnly.length, 11);
  assert.deepEqual(directFrame[0].directFigmaNodes, [
    "56:2", "56:3", "56:8", "56:47",
    "59:62", "59:63", "59:68", "59:100", "59:104",
  ]);
  assert.deepEqual(directComponent[0].directFigmaNodes, ["57:34", "57:57", "53:129"]);
  for (const route of semanticOnly) assert.deepEqual(route.directFigmaNodes, []);
  assert.match(qa, /no direct product\s+page frame/i);
  assert.match(qa, /do not claim page-level pixel parity/i);
});

test("S232G evidence descriptor set is exact, unique, and fixed-enum only", () => {
  assert.deepEqual(S232G_EVIDENCE_KEYS, [
    "commitSha", "deploymentSha", "viewport", "route", "scenario", "result", "remainingLimitation",
  ]);
  const descriptors = buildS232GExpectedEvidenceDescriptors();
  assert.equal(descriptors.length, 80);
  const keys = descriptors.map(s232gEvidenceCompositeKey);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(descriptors.filter((row) => row.scenario === "route-parity").length, 39);
  assert.equal(descriptors.filter((row) => row.scenario === "keyboard-focus-proxy").length, 13);
  assert.equal(descriptors.filter((row) => row.scenario === "width-equivalent-reflow-proxy").length, 13);
  assert.equal(descriptors.filter((row) => row.scenario === "alias-redirect").length, 4);
  assert.equal(
    descriptors.filter((row) => row.remainingLimitation === "not-actual-browser-zoom").length,
    13,
  );
  assert.equal(
    descriptors.filter((row) => row.remainingLimitation === "not-real-assistive-technology").length,
    14,
  );
});

test("S232G evidence validator accepts only the complete exact-SHA scalar matrix", () => {
  const sha = "a".repeat(40);
  const descriptors = buildS232GExpectedEvidenceDescriptors();
  const rows = descriptors.map((descriptor) => ({
    commitSha: sha,
    deploymentSha: sha,
    viewport: descriptor.viewport,
    route: descriptor.route,
    scenario: descriptor.scenario,
    result: "pass",
    remainingLimitation: descriptor.remainingLimitation,
  }));
  const ndjsonRaw = rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
  const summary = buildValidSummary(sha, rows.length);
  assert.deepEqual(Object.keys(summary).sort(), [...S232G_SUMMARY_KEYS].sort());
  const validated = validateS232GEvidenceValues({
    ndjsonRaw,
    summaryRaw: JSON.stringify(summary),
    expectedSha: sha,
  });
  assert.equal(validated.rows.length, 80);
  assert.equal(validated.summary.result, "pass");

  const missing = rows.slice(1).map((row) => JSON.stringify(row)).join("\n") + "\n";
  assert.throws(() => validateS232GEvidenceValues({ ndjsonRaw: missing, summaryRaw: JSON.stringify(summary), expectedSha: sha }));
  assert.throws(() => validateS232GEvidenceValues({ ndjsonRaw: ndjsonRaw.trimEnd(), summaryRaw: JSON.stringify(summary), expectedSha: sha }));
  assert.throws(() => validateS232GEvidenceValues({
    ndjsonRaw: ndjsonRaw.replace('"route":"/app?mode=second"', '"route":"https://private.example"'),
    summaryRaw: JSON.stringify(summary),
    expectedSha: sha,
  }));
  assert.match(validator, /matrix-duplicate/);
  assert.match(validator, /matrix-missing-row/);
  assert.match(validator, /matrix-final-newline/);
  assert.match(validator, /matrix-row-count/);
});

test("S232G validated artifact is canonicalized instead of copying hidden duplicate-key text", async () => {
  const sha = "b".repeat(40);
  const descriptors = buildS232GExpectedEvidenceDescriptors();
  const rows = descriptors.map((descriptor) => ({
    commitSha: sha,
    deploymentSha: sha,
    viewport: descriptor.viewport,
    route: descriptor.route,
    scenario: descriptor.scenario,
    result: "pass",
    remainingLimitation: descriptor.remainingLimitation,
  }));
  const matrix = rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
  const validSummary = JSON.stringify(buildValidSummary(sha, rows.length));
  const hiddenText = "PRIVATE_DUPLICATE_KEY_TEXT_MUST_NOT_SURVIVE";
  const duplicateKeySummary = `{"result":"${hiddenText}",${validSummary.slice(1)}`;
  const directory = await mkdtemp(path.join(tmpdir(), "s232g-canonical-"));
  const matrixPath = path.join(directory, "input.ndjson");
  const summaryPath = path.join(directory, "input.json");
  const validatedDirectory = path.join(directory, "validated");
  try {
    await Promise.all([
      writeFile(matrixPath, matrix, "utf8"),
      writeFile(summaryPath, duplicateKeySummary, "utf8"),
    ]);
    await validateAndCopyS232GEvidence({
      ndjsonPath: matrixPath,
      summaryPath,
      expectedSha: sha,
      validatedDirectory,
    });
    const canonicalSummary = await readFile(
      path.join(validatedDirectory, "s232g-summary.json"),
      "utf8",
    );
    assert.doesNotMatch(canonicalSummary, new RegExp(hiddenText));
    assert.equal(JSON.parse(canonicalSummary).result, "pass");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("S232G product surfaces expose one route heading, stable targets, and semantic tokens", () => {
  assert.match(calculatorPage, /data-s232g-route="calculator"/);
  assert.match(calculatorPage, /<h1[\s\S]*?\{workflow\.title\}[\s\S]*?<\/h1>/);
  assert.match(calculatorPage, /buttonVariants\(\{ variant: "outline"/);
  assert.doesNotMatch(calculatorPage, /<Link[^>]*>[\s\S]{0,120}<Button/);
  assert.match(calculatorTrainer, /testId="calculator-step-runner-v3"/);
  assert.doesNotMatch(calculatorTrainer, /className="mb-5 max-w-none"/);
  assert.match(
    calculatorTrainer,
    /trainerState === "active" \? "p-1 sm:p-5" : "p-4 sm:p-5"/,
  );
  assert.match(calculatorTrainer, /border-0[\s\S]*?p-0[\s\S]*?sm:border/);
  assert.match(calculatorTrainer, /px-4 pb-4 sm:px-0 sm:pb-0/);

  assert.match(weeklyPage, /data-s232g-route="weekly"/);
  assert.match(weeklyPage, /data-s232g-primary-action/);
  assert.match(weeklyPage, /<h1[\s\S]*?이번 주 2차 실행 계획[\s\S]*?<\/h1>/);
  assert.doesNotMatch(weeklyPage, /<Link[^>]*>[\s\S]{0,120}<Button/);

  assert.match(sessionPage, /data-s232g-route="session"/);
  assert.match(sessionPage, /<h1[\s\S]*?오늘 학습 세션[\s\S]*?<\/h1>/);
  assert.match(sessionPage, /data-s232g-session-runner/);
  assert.match(sessionPage, /rawPayload\?\.created_from_capture === true/);
  assert.match(sessionPage, /derivedPayload\?\.created_from_capture === true/);
  assert.match(firstOxRequestedClient, /rawPayload\?\.created_from_capture === true/);
  assert.match(firstOxRequestedClient, /derivedPayload\?\.created_from_capture === true/);
  assert.match(todaySessionRunner, /data-s232g-primary-action/);
  assert.doesNotMatch(todaySessionRunner, /<Link[^>]*>[\s\S]{0,120}<Button/);

  assert.doesNotMatch(answerReview, /#[0-9a-f]{3,8}\b/i);
  assert.match(answerReview, /var\(--brand-900\)/);
  assert.ok(studyLogPage.indexOf('if (modeParam === "second")') < studyLogPage.indexOf("getReviewOsServerContext("));
  assert.match(studyLogPage, /redirect\("\/app\/agenda\?mode=second"\)/);
});

test("S232G runtime and reporter are privacy-safe and fail closed on exact head", () => {
  assert.match(runtimeSpec, /requireExactHead: true/);
  assert.match(runtimeSpec, /runtimeRunnerSha === runtimeTargetSha/);
  assert.match(runtimeSpec, /beforeSha[\s\S]*?deploymentSha === runtimeTargetSha/);
  assert.match(runtimeSpec, /afterSha[\s\S]*?deploymentSha === runtimeTargetSha/);
  assert.match(runtimeSpec, /screenshot: "off"/);
  assert.match(runtimeSpec, /trace: "off"/);
  assert.match(runtimeSpec, /video: "off"/);
  assert.match(runtimeSpec, /serviceWorkers: "block"/);
  assert.match(runtimeSpec, /crossAccountApiDenialProbe/);
  assert.match(runtimeSpec, /cross-account-source-exact-null-api/);
  assert.match(runtimeSpec, /cross-account-rewrite-exact-null-api/);
  assert.match(runtimeSpec, /body\.detail === null/);
  assert.match(runtimeSpec, /owner-positive-before/);
  assert.match(runtimeSpec, /owner-positive-after/);
  assert.match(runtimeSpec, /fresh-owner-identity/);
  assert.match(runtimeSpec, /notesRoundTripProbe/);
  assert.match(runtimeSpec, /rewrite-reload-durability/);
  assert.match(runtimeSpec, /createSyntheticSourceThroughCapture/);
  assert.match(runtimeSpec, /capture-saving-announcement/);
  assert.match(runtimeSpec, /rewrite-source-exact-binding/);
  assert.match(runtimeSpec, /calculatorStepFigmaProbe/);
  assert.match(runtimeSpec, /calculator-component-probe-no-server-mutation/);
  assert.match(runtimeSpec, /viewport\.width < 640 \? 350 : 552/);
  assert.match(runtimeSpec, /viewport\.width < 640 \? 302 : 504/);
  assert.doesNotMatch(runtimeSpec, /probe\.width >= 280/);
  assert.doesNotMatch(runtimeSpec, /semanticSurfaceCount/);
  assert.match(runtimeSpec, /phase\.current === "auth-navigation"/);
  assert.match(
    runtimeSpec,
    /location\.pathname === "\/login" \|\| location\.pathname === "\/app"/,
  );
  assert.match(runtimeSpec, /observedAuthSignInRequestCount > 0/);
  assert.match(runtimeSpec, /causallyBoundNavigationAbortCount < 1/);
  assert.match(runtimeSpec, /causallyBoundNavigationAbortCount <= 1/);
  assert.doesNotMatch(runtimeSpec, /causallyBoundNavigationAbortCount <= 8/);
  assert.match(runtimeSpec, /data-s232g-skip-wrap-sentinel/);
  assert.match(runtimeSpec, /skip-link-wrap-sentinel-focus/);
  assert.match(runtimeSpec, /emitSafeFailureDiagnostic\("stage", code\)/);
  assert.match(runtimeSpec, /emitSafeFailureDiagnostic\("assertion", code\)/);
  assert.match(runtimeSpec, /\^\[a-z0-9-\]\{1,64\}\$/);
  assert.match(runtimeSpec, /staticStage\("runtime-preflight"/);
  assert.match(runtimeSpec, /staticStage\("main-runtime-guard"/);
  assert.match(runtimeSpec, /keyboard-forward-start-sentinel/);
  assert.doesNotMatch(runtimeSpec, /keyboard-visible-focus-activation/);
  assert.match(runtimeSpec, /actualBrowserZoomClaimed: false/);
  assert.match(runtimeSpec, /realScreenReaderClaimed: false/);
  assert.doesNotMatch(runtimeSpec, /monitorRuntimeErrors/);
  assert.doesNotMatch(runtimeSpec, /testInfo\.attach/);
  assert.doesNotMatch(runtimeSpec, /\.screenshot\(/);
  assert.doesNotMatch(runtimeSpec, /expect\(.*violations/);

  for (const forbidden of [
    "onError", "onStdOut", "onStdErr", "test.location", "attachments",
    "result.stdout", "result.stderr", "chunk",
  ]) {
    assert.equal(reporter.includes(forbidden), false, `metadata reporter must not read ${forbidden}`);
  }
  assert.match(reporter, /printsToStdio\(\)/);
  assert.match(reporter, /allowedTestStatuses/);
  assert.match(reporter, /allowedRunStatuses/);
  assert.match(reporter, /safeS232GFailurePattern/);
  assert.match(reporter, /\[a-z0-9-\]\{1,64\}/);
  assert.match(reporter, /return "unknown"/);
  assert.doesNotMatch(reporter, /\$\{(?:test\.title|error\.message)\}/);
});

test("S232G workflow checks the exact deployment and uploads validated files only", () => {
  assert.match(workflow, /agent\/s232g-final-aggregate-parity/);
  assert.match(workflow, /<!-- run-s232g-auth-e2e -->/);
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /value\?\.sha === process\.env\.EXPECTED_SHA/);
  assert.match(workflow, /value\?\.environment === "Preview"/);
  assert.match(workflow, /payload\.deploymentSha !== process\.env\.EXPECTED_SHA/);
  assert.match(
    workflow,
    /E2E_USER_A_EMAIL: \$\{\{ secrets\.E2E_USER_A_EMAIL \|\| secrets\.E2E_USER_EMAIL \}\}/,
  );
  assert.match(
    workflow,
    /E2E_USER_A_PASSWORD: \$\{\{ secrets\.E2E_USER_A_PASSWORD \|\| secrets\.E2E_USER_PASSWORD \}\}/,
  );
  assert.match(workflow, /E2E_USER_B_EMAIL: \$\{\{ secrets\.E2E_USER_B_EMAIL \}\}/);
  assert.doesNotMatch(workflow, /E2E_USER_B_(?:EMAIL|PASSWORD):[^\n]*\|\|/);
  assert.match(workflow, /--workers=1/);
  assert.match(workflow, /--retries=0/);
  assert.match(workflow, /--reporter=\.\/tests\/e2e\/support\/s232g-metadata-reporter\.ts/);
  assert.match(workflow, /> "\$\{runner_log\}" 2>&1/);
  assert.match(workflow, /failure-code=\(\[a-z0-9-\]\{1,64\}\)/);
  assert.match(workflow, /failure; kind=\(stage\|assertion\); code=/);
  assert.match(workflow, /paste -sd ';' -/);
  assert.match(workflow, /rm -f "\$\{runner_log\}"/);
  assert.match(workflow, /class=unknown,status=unknown,code=unknown/);
  assert.match(workflow, /2> "\$\{curl_error_path\}"/);
  assert.match(workflow, /node scripts\/validate-s232g-evidence\.mjs/);
  assert.match(workflow, /validated-s232g-evidence\/s232g-matrix\.ndjson/);
  assert.match(workflow, /validated-s232g-evidence\/s232g-summary\.json/);
  assert.match(workflow, /retention-days: 7/);
  assert.doesNotMatch(workflow, /if: always\(\)/);
  assert.match(nodeRunner, /tests\/s232g-final-aggregate-parity\.test\.mjs/);
});

test("S232G documentation keeps actual zoom and real screen readers as hard manual gates", () => {
  assert.match(qa, /720 CSS-pixel desktop-width-equivalent reflow proxy/);
  assert.match(qa, /does \*\*not\*\* certify actual browser zoom or a real screen reader/);
  assert.match(qa, /Chrome at actual 200% zoom/);
  assert.match(qa, /Edge at actual 200% zoom/);
  assert.match(qa, /NVDA keyboard reading/);
  assert.match(qa, /VoiceOver keyboard reading/);
  assert.match(qa, /Any later commit invalidates that manual matrix/);
  assert.match(qa, /bounded and ranked/);
  assert.match(qa, /not that S232G\s+changed or overrode the existing primary-task ranking/);
  assert.match(qa, /#621 can merge/);
  assert.match(qa, /parent #574 must not close/);
});
