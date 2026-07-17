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
  S232G_WIDTH_EQUIVALENT_VIEWPORT,
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
const captureFormSource = read("components/review-os/capture-form.tsx");
const itemDetailPage = read("app/app/items/[itemId]/page.tsx");

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

function literalV3ComponentInventory() {
  const components = new Set();
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
        const source = read(absolute);
        assert.doesNotMatch(source, /data-v3-component=\{/);
        for (const match of source.matchAll(/data-v3-component="([^"]+)"/g)) {
          components.add(match[1]);
        }
      }
    }
  };
  walk("app");
  walk("components");
  return [...components].sort();
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
  assert.equal(
    S232G_ROUTES.find((route) => route.key === "first-ox")?.keyboardSelector,
    '[data-s232g-route="first-ox"] details > summary',
  );
  assert.deepEqual(directFrame[0].directFigmaNodes, [
    "56:2", "56:3", "56:8", "56:47",
    "59:62", "59:63", "59:68", "59:100", "59:104",
  ]);
  assert.deepEqual(directComponent[0].directFigmaNodes, ["57:34", "57:57", "53:129"]);
  for (const route of semanticOnly) assert.deepEqual(route.directFigmaNodes, []);
  assert.match(qa, /no direct product\s+page frame/i);
  assert.match(qa, /do not claim page-level pixel parity/i);
});

test("S232G runtime recognizes every literal V3 product component", () => {
  const knownComponentsBlock = runtimeSpec.match(
    /const knownComponents = new Set\(\[[\s\S]*?\]\);/,
  )?.[0] ?? "";
  assert.notEqual(knownComponentsBlock, "");
  const runtimeKnownComponents = [
    ...knownComponentsBlock.matchAll(/"([^"]+)"/g),
  ].map((match) => match[1]).sort();
  assert.deepEqual(runtimeKnownComponents, literalV3ComponentInventory());
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
  assert.match(
    calculatorPage,
    /isCasioFocus && !isRecoveryMode[\s\S]*?<CalculatorRoutineTrainer[\s\S]*?source="answer-review"[\s\S]*?className="border-0 sm:border"/,
  );
  assert.match(calculatorTrainer, /testId="calculator-step-runner-v3"/);
  assert.doesNotMatch(calculatorTrainer, /className="mb-5 max-w-none"/);
  assert.match(
    calculatorTrainer,
    /trainerState === "active" \? "p-1 sm:p-5" : "p-4 sm:p-5"/,
  );
  assert.match(
    calculatorTrainer,
    /className="-mx-1[\s\S]*?border-0[\s\S]*?p-0[\s\S]*?sm:mx-0[\s\S]*?sm:border/,
  );
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
  assert.match(runtimeSpec, /capture-input-method-ready/);
  assert.match(runtimeSpec, /capture-input-method-activate/);
  assert.match(runtimeSpec, /Capture input method must be hydrated/);
  assert.match(runtimeSpec, /key\.startsWith\("__reactProps\$"\)/);
  assert.match(runtimeSpec, /typeof reactProps\?\.onClick === "function"/);
  assert.match(
    runtimeSpec,
    /textInputMethod\.evaluate\(\s*\(element\)[\s\S]*?\),\s*\{ timeout: 20_000 \},\s*\)/,
  );
  assert.match(runtimeSpec, /expect\(textInputMethod\)\.toBeFocused/);
  assert.match(
    runtimeSpec,
    /textInputMethod\.press\("Enter", \{ timeout: 20_000 \}\)/,
  );
  for (const stage of [
    "capture-text-entry-binding",
    "capture-text-entry-visible",
    "capture-text-entry-focused",
    "capture-text-entry-editable",
    "capture-text-entry-fill",
    "capture-source-flow",
    "capture-source-route-hold",
    "capture-quick-save-ready",
    "capture-quick-save-click",
    "capture-saving-visible",
    "capture-saving-semantics",
    "capture-saving-work-lock-count",
    "capture-source-mutation-release",
    "capture-source-emergency-release",
    "capture-source-response-wait",
    "capture-source-route-remove",
    "capture-source-receipt",
    "capture-confirmation-visible",
    "capture-confirmation-classify",
    "capture-completed-visible",
    "capture-completed-announcement",
  ]) {
    assert.match(runtimeSpec, new RegExp(`staticStage\\(\\s*"${stage}"`));
  }
  assert.match(runtimeSpec, /input\.fill\(syntheticCaptureText, \{ timeout: 20_000 \}\)/);
  assert.match(runtimeSpec, /request\.method\(\) === "POST"/);
  assert.match(runtimeSpec, /new URL\(request\.url\(\)\)\.pathname === "\/api\/os\/items"/);
  assert.doesNotMatch(runtimeSpec, /page\.route\("\*\*\/api\/os\/items", holdItemMutation, \{ times: 1 \}\)/);
  assert.match(runtimeSpec, /capture-held-item-mutation-exact/);
  assert.match(runtimeSpec, /capture-held-item-mutation-final-exact/);
  assert.match(runtimeSpec, /capture-source-route-handler/);
  assert.match(runtimeSpec, /capture-source-receipt-shape/);
  assert.match(runtimeSpec, /captureConfirmationFailureCodes/);
  for (const state of [
    "completed",
    "dedupe-conflict",
    "local-fallback",
    "persistence-error-unbound",
    "receipt-bound-shell-without-completed",
    "multiple-confirmations",
    "unknown",
  ]) {
    assert.match(runtimeSpec, new RegExp(`(?:\\"|\\b)${state}(?:\\"|\\b)`));
  }
  const confirmationClassifierStart = runtimeSpec.indexOf(
    "const confirmations = page.locator",
  );
  const confirmationClassifierEnd = runtimeSpec.indexOf(
    "const completed = page.locator",
    confirmationClassifierStart,
  );
  assert.ok(confirmationClassifierStart >= 0 && confirmationClassifierEnd > confirmationClassifierStart);
  const confirmationClassifier = runtimeSpec.slice(
    confirmationClassifierStart,
    confirmationClassifierEnd,
  );
  assert.doesNotMatch(confirmationClassifier, /textContent|innerHTML|outerHTML/);
  assert.doesNotMatch(confirmationClassifier, /receipt\.item|sourceTitle|syntheticCaptureText/);
  for (const stage of [
    "secondary-login-navigation",
    "secondary-login-form-visible",
    "secondary-login-hydrated",
    "secondary-login-hydration-sentinel",
    "secondary-login-credential-retention",
    "secondary-login-submit",
    "secondary-login-app-classify",
    "secondary-login-app-visible",
  ]) {
    assert.match(runtimeSpec, new RegExp(`staticStage\\(\\s*"${stage}"`));
  }
  assert.match(runtimeSpec, /classifySecondaryLoginResponse/);
  assert.match(runtimeSpec, /secondaryLoginFailureCodes/);
  for (const state of [
    "accepted",
    "auth-rejected",
    "access-denied",
    "server-error",
    "unexpected",
  ]) {
    assert.match(runtimeSpec, new RegExp(`(?:"|\\b)${state}(?:"|\\b)`));
  }
  assert.match(runtimeSpec, /classifySecondaryAppState/);
  assert.match(runtimeSpec, /secondaryAppFailureCodes/);
  for (const state of [
    "allowed",
    "invite-denied",
    "access-unavailable",
    "session-lost",
    "onboarding",
    "unknown",
  ]) {
    assert.match(runtimeSpec, new RegExp(`(?:"|\\b)${state}(?:"|\\b)`));
  }
  assert.match(runtimeSpec, /data-review-os-access-status="denied"/);
  assert.match(runtimeSpec, /data-review-os-access-status="unavailable"/);
  assert.match(runtimeSpec, /const secondaryAppReadySelector = \[/);
  assert.ok(
    runtimeSpec.includes(
      `'[data-s232f4a-route-state="zero-essential-records"][data-s232f4a-surface="today"] [data-testid="s232f4a-today-empty-state"]'`,
    ),
  );
  assert.equal(
    (runtimeSpec.match(/page\.locator\(secondaryAppReadySelector\)/g) ?? []).length,
    2,
  );
  const readySelectorStart = runtimeSpec.indexOf(
    "const secondaryAppReadySelector = [",
  );
  const readySelectorEnd = runtimeSpec.indexOf("].join", readySelectorStart);
  assert.ok(readySelectorStart >= 0 && readySelectorEnd > readySelectorStart);
  const readySelectorSource = runtimeSpec.slice(readySelectorStart, readySelectorEnd);
  assert.doesNotMatch(
    readySelectorSource,
    /route-state="(?:error|loading)"|degraded-local-read/,
  );
  assert.doesNotMatch(
    readySelectorSource,
    /['"]\[data-s232f4a-route-state="zero-essential-records"\]\[data-s232f4a-surface="today"\]['"]/,
  );
  assert.match(runtimeSpec, /page\.locator\("\[data-learner-shell\]"\)/);
  assert.match(runtimeSpec, /pathname === "\/app"/);
  assert.match(runtimeSpec, /for \(let attempt = 0; attempt < 80; attempt \+= 1\)/);
  assert.match(runtimeSpec, /page\.waitForTimeout\(250\)/);
  const secondaryClassifierStart = runtimeSpec.indexOf(
    "async function classifySecondaryAppState",
  );
  const secondaryClassifierEnd = runtimeSpec.indexOf(
    "async function observedDeploymentSha",
    secondaryClassifierStart,
  );
  assert.ok(
    secondaryClassifierStart >= 0 && secondaryClassifierEnd > secondaryClassifierStart,
  );
  const secondaryClassifierSource = runtimeSpec.slice(
    secondaryClassifierStart,
    secondaryClassifierEnd,
  );
  const inviteDeniedReturn = secondaryClassifierSource.indexOf('return "invite-denied"');
  const accessUnavailableReturn = secondaryClassifierSource.indexOf(
    'return "access-unavailable"',
  );
  const onboardingReturn = secondaryClassifierSource.indexOf('return "onboarding"');
  const allowedReturn = secondaryClassifierSource.indexOf('return "allowed"');
  assert.ok(
    inviteDeniedReturn >= 0 &&
      inviteDeniedReturn < accessUnavailableReturn &&
      accessUnavailableReturn < onboardingReturn &&
      onboardingReturn < allowedReturn,
  );
  assert.match(runtimeSpec, /denialStatus === 200 \|\| denialStatus === 404/);
  assert.match(runtimeSpec, /meta\[name="robots"\]\[content="noindex"\]/);
  assert.match(runtimeSpec, /detailDenied\.notFoundNoindexPresent/);
  assert.match(runtimeSpec, /detailDenied\.ledgerCount === 0/);
  assert.match(
    runtimeSpec,
    /cross-account-detail-stable-denial[\s\S]*cross-account-detail-noindex-stable[\s\S]*cross-account-detail-protected-surface-absent[\s\S]*cross-account-detail-denial-state-exact[\s\S]*cross-account-detail-noindex-present[\s\S]*cross-account-detail-denial-copy[\s\S]*cross-account-detail-return-link-exact[\s\S]*cross-account-detail-content-absent/,
  );
  assert.doesNotMatch(
    runtimeSpec,
    /cross-account-detail-ui-denial|cross-account-detail-noindex-exact/,
  );
  assert.match(
    runtimeSpec,
    /expectedCrossAccountHttpErrorCountTarget = denialStatus === 404 \? 1 : 0/,
  );
  assert.match(
    runtimeSpec,
    /expectedCrossAccountHttpErrorCount === expectedCrossAccountHttpErrorCountTarget/,
  );
  assert.match(runtimeSpec, /expectedCrossAccountConsoleErrorCount < 1/);
  assert.match(runtimeSpec, /expectedCrossAccountItemPath: string \| null = null/);
  assert.match(
    runtimeSpec,
    /secondaryPhase,\s*`\/app\/items\/\$\{encodeURIComponent\(rewrittenItemId\)\}`/,
  );
  const runtimeGuardStart = runtimeSpec.indexOf(
    "async function installPrivacySafeRuntimeGuard",
  );
  const runtimeGuardEnd = runtimeSpec.indexOf(
    "async function staticStage",
    runtimeGuardStart,
  );
  assert.ok(runtimeGuardStart >= 0 && runtimeGuardEnd > runtimeGuardStart);
  const runtimeGuardSource = runtimeSpec.slice(runtimeGuardStart, runtimeGuardEnd);
  const consoleGuardStart = runtimeGuardSource.indexOf('page.on("console"');
  const consoleGuardEnd = runtimeGuardSource.indexOf(
    'page.on("pageerror"',
    consoleGuardStart,
  );
  const responseGuardStart = runtimeGuardSource.indexOf('page.on("response"');
  assert.ok(
    consoleGuardStart >= 0 &&
      consoleGuardEnd > consoleGuardStart &&
      responseGuardStart > consoleGuardEnd,
  );
  const consoleGuardSource = runtimeGuardSource.slice(consoleGuardStart, consoleGuardEnd);
  const responseGuardSource = runtimeGuardSource.slice(responseGuardStart);
  for (const guardSource of [consoleGuardSource, responseGuardSource]) {
    assert.match(guardSource, /phase\.current === "expected-cross-account-ui-denial"/);
    assert.match(guardSource, /expectedCrossAccountItemPath !== null/);
    assert.match(guardSource, /location\.origin === runtimeOrigin/);
    assert.match(guardSource, /location\.pathname === expectedCrossAccountItemPath/);
    assert.match(guardSource, /location\.search === "\?mode=second"/);
    assert.match(guardSource, /location\.hash === ""/);
    assert.doesNotMatch(guardSource, /\^\\\/app\\\/items/);
  }
  assert.match(consoleGuardSource, /status of 404/);
  assert.match(responseGuardSource, /response\.status\(\) === 404/);
  assert.match(responseGuardSource, /response\.request\(\)\.isNavigationRequest\(\)/);
  assert.match(
    runtimeSpec,
    /expectedCrossAccountConsoleErrorCount === expectedCrossAccountHttpErrorCountTarget[\s\S]*expectedCrossAccountConsoleErrorCount <= 1/,
  );
  assert.match(runtimeSpec, /"exact-cross-account-console-denial-count"/);
  const consoleClassifierStart = runtimeSpec.indexOf(
    "function classifyUnexpectedConsole",
  );
  const consoleClassifierEnd = runtimeSpec.indexOf(
    "function unexpectedConsoleFailureCode",
    consoleClassifierStart,
  );
  assert.ok(
    consoleClassifierStart >= 0 && consoleClassifierEnd > consoleClassifierStart,
  );
  const consoleClassifierSource = runtimeSpec.slice(
    consoleClassifierStart,
    consoleClassifierEnd,
  );
  assert.doesNotMatch(
    consoleClassifierSource,
    /process\.stdout|console\.|writeFile|JSON\.stringify|testInfo\.attach/,
  );
  assert.doesNotMatch(
    consoleClassifierSource,
    /\b(?:const|let|var)\s+(?:text|url|content|raw)\b/,
  );
  assert.match(consoleGuardSource, /phase\.firstUnexpectedConsole === null/);
  assert.match(consoleGuardSource, /phase: phase\.diagnosticPhase/);
  assert.match(consoleGuardSource, /kind: classifyUnexpectedConsole\(message\)/);
  assert.match(
    consoleGuardSource,
    /ERR_BLOCKED_BY_CLIENT\(\?:\\\.Inspector\)\?\$\/\.test/,
  );
  assert.doesNotMatch(
    consoleGuardSource,
    /message\.text\(\) === "Failed to load resource: net::ERR_BLOCKED_BY_CLIENT"/,
  );
  assert.match(
    consoleGuardSource,
    /isPreviewToolbarUrl\(message\.location\(\)\.url\)/,
  );
  assert.match(
    consoleGuardSource,
    /counters\.excludedPreviewToolbarConsoleErrorCount <\s*counters\.blockedPreviewToolbarMutationCount/,
  );
  assert.ok(
    consoleGuardSource.indexOf("if (exactExpectedDenialConsoleError)") <
      consoleGuardSource.indexOf("if (exactToolbarBlock)") &&
      consoleGuardSource.indexOf("if (exactToolbarBlock)") <
        consoleGuardSource.indexOf("counters.consoleErrorCount += 1") &&
      consoleGuardSource.indexOf("counters.consoleErrorCount += 1") <
        consoleGuardSource.indexOf("phase.firstUnexpectedConsole === null"),
  );
  const consoleContexts = ["main", "secondary", "fresh"];
  const consolePhases = [
    "setup", "auth", "durable", "cross-api", "cross-ui", "collections",
    "fresh-owner", "aliases", "routes", "postflight",
  ];
  const consoleClasses = [
    "toolbar-inspector", "toolbar-bound", "blocked", "http404", "http4xx",
    "http5xx", "resource", "hydration", "exception", "other",
  ];
  for (const context of consoleContexts) {
    assert.match(`console-${context}-diagnostic-missing`, /^[a-z0-9-]{1,64}$/);
    for (const phase of consolePhases) {
      for (const kind of consoleClasses) {
        assert.match(`console-${context}-${phase}-${kind}`, /^[a-z0-9-]{1,64}$/);
      }
    }
  }
  assert.match(runtimeSpec, /`console-\$\{context\}-diagnostic-missing`/);
  assert.match(
    runtimeSpec,
    /`console-\$\{context\}-\$\{observation\.phase\}-\$\{observation\.kind\}`/,
  );
  for (const phase of consolePhases) {
    assert.match(runtimeSpec, new RegExp(`diagnosticPhase = "${phase}"|diagnosticPhase: "${phase}"`));
  }
  assert.doesNotMatch(
    runtimeSpec,
    /"unexpected-console-errors"|"unexpected-console-(?:main|secondary|fresh)"/,
  );
  const requestClassifierStart = runtimeSpec.indexOf(
    "function classifyUnexpectedRequest",
  );
  const requestClassifierEnd = runtimeSpec.indexOf(
    "function unexpectedRequestFailureCode",
    requestClassifierStart,
  );
  assert.ok(
    requestClassifierStart >= 0 && requestClassifierEnd > requestClassifierStart,
  );
  const requestClassifierSource = runtimeSpec.slice(
    requestClassifierStart,
    requestClassifierEnd,
  );
  assert.doesNotMatch(
    requestClassifierSource,
    /process\.stdout|console\.|writeFile|JSON\.stringify|testInfo\.attach/,
  );
  const requestGuardStart = runtimeGuardSource.indexOf('page.on("requestfailed"');
  const requestGuardEnd = runtimeGuardSource.indexOf(
    'page.on("response"',
    requestGuardStart,
  );
  assert.ok(requestGuardStart >= 0 && requestGuardEnd > requestGuardStart);
  const requestGuardSource = runtimeGuardSource.slice(requestGuardStart, requestGuardEnd);
  assert.match(requestGuardSource, /phase\.firstUnexpectedRequest === null/);
  assert.match(requestGuardSource, /phase: unexpectedRequestDiagnosticPhase\(phase\)/);
  assert.match(requestGuardSource, /kind: classifyUnexpectedRequest\(request, failure\)/);
  assert.match(requestGuardSource, /target: unexpectedTarget/);
  assert.match(requestGuardSource, /resource: classifyUnexpectedRequestResource\(request\)/);
  assert.doesNotMatch(
    requestGuardSource,
    /vc-(?:fs|fc|ms|mc|m0|m1|mx|s0|w0|x)/,
  );
  assert.ok(
    requestGuardSource.indexOf('isPreviewToolbarUrl(request.url())') <
      requestGuardSource.indexOf("if (boundedNavigationAbort)") &&
      requestGuardSource.indexOf("if (boundedNavigationAbort)") <
        requestGuardSource.indexOf("counters.requestFailureCount += 1") &&
      requestGuardSource.indexOf("counters.requestFailureCount += 1") <
        requestGuardSource.indexOf("phase.firstUnexpectedRequest === null"),
  );
  const requestClasses = [
    "nav-abort", "resource-abort", "blocked", "timeout", "connection", "other",
  ];
  const requestPhases = [
    "setup", "auth-pre", "auth-post", "durable", "cross-api", "cross-ui",
    "collections", "fresh-owner", "aliases", "routes", "postflight",
  ];
  const vercelResidualFamilies = [
    "vc-x0",
    ...["r", "s", "c"].flatMap((relation) =>
      ["a", "k", "n", "x"].flatMap((shape) =>
        ["s", "m", "l"].map(
          (length) => `vc-x${relation}${shape}${length}`,
        ),
      ),
    ),
  ];
  assert.equal(vercelResidualFamilies.length, 37);
  assert.equal(new Set(vercelResidualFamilies).size, 37);
  const vercelShapedTargets = [
    "vc-w", "vc-r", "vc-d", "vc-rate", "vc-mfe", "vc-ping",
    "vc-fs", "vc-fc", "vc-ms", "vc-mc", "vc-m0", "vc-m1", "vc-mx",
    "vc-s0", "vc-w0", ...vercelResidualFamilies,
  ].flatMap((family) =>
    ["tb", "rt", "ot", "na"].flatMap((initiator) =>
      ["gc", "gq", "nc", "nq"].map(
        (shape) => `${family}-${initiator}-${shape}`,
      ),
    ),
  );
  const requestTargets = [
    "root-shell", "next-static", "next-rsc", "next-image", "next-internal",
    "vc-toolbar", "devtools", "vc-flags", "vc-flags-q", "vc-security",
    "vc-metrics", ...vercelShapedTargets,
    "well-known", "public-meta", "manifest", "icon", "favicon", "sw", "asset",
    "login", "app", "item", "auth-api", "items-api", "api", "app-route", "other",
    "invalid",
  ];
  const requestResources = [
    "document", "image", "font", "style", "script", "fetch", "xhr",
    "manifest", "other",
  ];
  for (const context of consoleContexts) {
    assert.match(`req-${context}-diagnostic-missing`, /^[a-z0-9-]{1,64}$/);
    for (const phase of requestPhases) {
      for (const kind of requestClasses) {
        for (const target of requestTargets) {
          for (const resource of requestResources) {
            assert.match(
              `req-${context}-${phase}-${kind}-${target}-${resource}`,
              /^[a-z0-9-]{1,64}$/,
            );
          }
        }
      }
    }
  }
  assert.match(runtimeSpec, /`req-\$\{context\}-diagnostic-missing`/);
  assert.match(
    runtimeSpec,
    /`req-\$\{context\}-\$\{observation\.phase\}-\$\{observation\.kind\}-\$\{observation\.target\}-\$\{observation\.resource\}`/,
  );
  assert.match(runtimeSpec, /location\.searchParams\.has\("_rsc"\)/);
  assert.doesNotMatch(runtimeSpec, /location\.searchParams\.get\("_rsc"\)/);
  assert.match(runtimeSpec, /location\.pathname\.startsWith\("\/_next-live\/"\)/);
  assert.match(
    runtimeSpec,
    /location\.pathname === "\/\.well-known\/appspecific\/com\.chrome\.devtools\.json"/,
  );
  assert.match(runtimeSpec, /location\.pathname === "\/\.well-known\/vercel\/flags"/);
  assert.match(
    runtimeSpec,
    /location\.search === "" && location\.hash === "" \? "vc-flags" : "vc-flags-q"/,
  );
  assert.match(runtimeSpec, /location\.pathname\.startsWith\("\/\.well-known\/vercel\/security\/"\)/);
  assert.match(runtimeSpec, /location\.pathname === "\/\.well-known\/vercel\/rate-limit-api"/);
  assert.match(runtimeSpec, /location\.pathname\.startsWith\("\/\.well-known\/vercel\/rate-limit-api\/"\)/);
  assert.match(runtimeSpec, /location\.pathname === "\/\.well-known\/vercel\/microfrontends\/client-config"/);
  assert.match(runtimeSpec, /location\.pathname === "\/_vercel\/insights"/);
  assert.match(runtimeSpec, /location\.pathname\.startsWith\("\/_vercel\/insights\/"\)/);
  assert.match(runtimeSpec, /location\.pathname === "\/_vercel\/speed-insights"/);
  assert.match(runtimeSpec, /location\.pathname\.startsWith\("\/_vercel\/speed-insights\/"\)/);
  assert.doesNotMatch(runtimeSpec, /startsWith\("\/_vercel\/(?:speed-)?insights"\)/);
  assert.match(runtimeSpec, /location\.pathname\.startsWith\("\/\.well-known\/"\)/);
  assert.match(runtimeSpec, /vercelRequestInitiators: new WeakMap\(\)/);
  assert.match(
    runtimeSpec,
    /vercelRequestInitiators: WeakMap<Request, VercelRequestInitiator>/,
  );
  assert.match(runtimeSpec, /request\.serviceWorker\(\) \|\| request\.isNavigationRequest\(\)/);
  assert.match(runtimeSpec, /isPreviewToolbarUrl\(frameLocation\.toString\(\)\)/);
  assert.match(runtimeSpec, /frameLocation\.origin === runtimeOrigin/);
  assert.match(runtimeSpec, /request\.method\(\) === "GET"/);
  assert.match(runtimeSpec, /location\.search === "" && location\.hash === ""/);
  assert.match(
    runtimeSpec,
    /phase\.vercelRequestInitiators\.get\(request\) \?\? "na"/,
  );
  assert.match(
    runtimeSpec,
    /location\.origin === runtimeOrigin &&[\s\S]*?phase\.vercelRequestInitiators\.set\([\s\S]*?classifyVercelRequestInitiator\(request, runtimeOrigin\)/,
  );
  const fallbackFamilyStart = runtimeSpec.indexOf(
    "function classifyVercelFallbackFamily",
  );
  const fallbackFamilyEnd = runtimeSpec.indexOf(
    "function classifyVercelRequestInitiator",
    fallbackFamilyStart,
  );
  const fallbackFamilySource = runtimeSpec.slice(
    fallbackFamilyStart,
    fallbackFamilyEnd,
  );
  assert.match(
    fallbackFamilySource,
    /pathname\.startsWith\("\/\.well-known\/vercel\/"\)\) return "vc-w"/,
  );
  assert.match(
    fallbackFamilySource,
    /pathname\.startsWith\("\/_vercel\/"\)\) return "vc-r"/,
  );
  assert.match(
    fallbackFamilySource,
    /pathname === "\/__vercel" \|\| pathname\.startsWith\("\/__vercel\/"\)[\s\S]*?return "vc-d"/,
  );
  assert.match(fallbackFamilySource, /return null/);
  const fallbackTargetStart = runtimeSpec.indexOf(
    "function classifyVercelShapedTarget",
  );
  const fallbackTargetEnd = runtimeSpec.indexOf(
    "function classifyVercelResidualFamily",
    fallbackTargetStart,
  );
  const fallbackTargetSource = runtimeSpec.slice(
    fallbackTargetStart,
    fallbackTargetEnd,
  );
  assert.match(
    fallbackTargetSource,
    /const cleanLocation = location\.search === "" && location\.hash === ""/,
  );
  assert.match(
    fallbackTargetSource,
    /request\.method\(\) === "GET"[\s\S]*?\? "gc"[\s\S]*?: "gq"[\s\S]*?\? "nc"[\s\S]*?: "nq"/,
  );
  assert.match(
    fallbackTargetSource,
    /return `\$\{family\}-\$\{initiator\}-\$\{requestShape\}`/,
  );
  assert.doesNotMatch(
    fallbackTargetSource,
    /process\.stdout|console\.|writeFile|JSON\.stringify|testInfo\.attach/,
  );
  const residualFamilyStart = runtimeSpec.indexOf(
    "function classifyVercelResidualFamily",
  );
  const residualFamilyEnd = runtimeSpec.indexOf(
    "function classifyUnexpectedRequestTarget",
    residualFamilyStart,
  );
  assert.ok(
    residualFamilyStart >= 0 && residualFamilyEnd > residualFamilyStart,
  );
  const residualFamilySource = runtimeSpec.slice(
    residualFamilyStart,
    residualFamilyEnd,
  );
  assert.match(
    residualFamilySource,
    /const prefix = "\/\.well-known\/vercel\/"/,
  );
  assert.match(
    residualFamilySource,
    /pathname\.startsWith\(prefix\) \? pathname\.slice\(prefix\.length\) : ""/,
  );
  assert.match(residualFamilySource, /if \(suffix === ""\) return "vc-x0"/);
  assert.match(residualFamilySource, /const slash = suffix\.indexOf\("\/"\)/);
  assert.match(
    residualFamilySource,
    /slash === -1 \? suffix : suffix\.slice\(0, slash\)/,
  );
  assert.match(
    residualFamilySource,
    /slash === -1 \? "r" : slash === suffix\.length - 1 \? "s" : "c"/,
  );
  assert.match(
    residualFamilySource,
    /\/\^\[a-z\]\+\$\/\.test\(first\)\s*\?\s*"a"\s*:\s*\/\^\[a-z0-9\]\+\(\?:-\[a-z0-9\]\+\)\+\$\/\.test\(first\)\s*\?\s*"k"\s*:\s*\/\^\[a-z0-9\]\+\$\/\.test\(first\)\s*(?:\/\/[^\n]*\n\s*)?\?\s*"n"\s*:\s*"x"/,
  );
  assert.match(
    residualFamilySource,
    /first\.length <= 8 \? "s" : first\.length <= 16 \? "m" : "l"/,
  );
  assert.match(
    residualFamilySource,
    /return `vc-x\$\{relation\}\$\{shape\}\$\{length\}`/,
  );
  assert.doesNotMatch(
    residualFamilySource,
    /\b(?:searchParams|URL|Buffer|btoa|atob|decodeURI(?:Component)?|crypto|createHash)\b|subtle\.digest|process\.stdout|console\.|writeFile|JSON\.stringify|testInfo\.attach|\.search\b|\.hash\b/,
  );
  assert.doesNotMatch(
    residualFamilySource,
    /["']\/\.well-known\/vercel\/[^"']+["']/,
  );
  assert.doesNotMatch(
    residualFamilySource,
    /\$\{(?:pathname|suffix|first)(?:\.[^}]*)?\}/,
  );
  assert.deepEqual(
    [...residualFamilySource.matchAll(/\breturn\s+([^;\n]+);/g)].map(
      (match) => match[1].trim(),
    ),
    ['"vc-x0"', "`vc-x${relation}${shape}${length}`"],
  );
  const requestTargetClassifierStart = runtimeSpec.indexOf(
    "function classifyUnexpectedRequestTarget",
  );
  const requestTargetClassifierEnd = runtimeSpec.indexOf(
    "function classifyUnexpectedRequestResource",
    requestTargetClassifierStart,
  );
  const requestTargetClassifierSource = runtimeSpec.slice(
    requestTargetClassifierStart,
    requestTargetClassifierEnd,
  );
  assert.match(
    requestTargetClassifierSource,
    /classifyVercelShapedTarget\("vc-rate", initiator, request, location\)/,
  );
  assert.match(
    requestTargetClassifierSource,
    /classifyVercelShapedTarget\("vc-mfe", initiator, request, location\)/,
  );
  assert.match(
    requestTargetClassifierSource,
    /classifyVercelShapedTarget\("vc-ping", initiator, request, location\)/,
  );
  for (const family of [
    "vc-fs", "vc-fc", "vc-ms", "vc-mc", "vc-m0", "vc-m1", "vc-mx",
    "vc-s0", "vc-w0",
  ]) {
    assert.match(
      requestTargetClassifierSource,
      new RegExp(
        `classifyVercelShapedTarget\\("${family}", initiator, request, location\\)`,
      ),
    );
  }
  assert.match(
    requestTargetClassifierSource,
    /classifyVercelShapedTarget\(\s*classifyVercelResidualFamily\(location\.pathname\),/,
  );
  const flagsPathOffset = requestTargetClassifierSource.indexOf(
    'location.pathname === "/.well-known/vercel/flags"',
  );
  const flagsSlashOffset = requestTargetClassifierSource.indexOf(
    'location.pathname === "/.well-known/vercel/flags/"',
  );
  const flagsChildOffset = requestTargetClassifierSource.indexOf(
    'location.pathname.startsWith("/.well-known/vercel/flags/")',
  );
  const securityRootOffset = requestTargetClassifierSource.indexOf(
    'location.pathname === "/.well-known/vercel/security"',
  );
  const securityChildOffset = requestTargetClassifierSource.indexOf(
    'location.pathname.startsWith("/.well-known/vercel/security/")',
  );
  const ratePathOffset = requestTargetClassifierSource.indexOf(
    'location.pathname === "/.well-known/vercel/rate-limit-api"',
  );
  const mfePathOffset = requestTargetClassifierSource.indexOf(
    'location.pathname === "/.well-known/vercel/microfrontends/client-config"',
  );
  const mfeSlashOffset = requestTargetClassifierSource.indexOf(
    'location.pathname === "/.well-known/vercel/microfrontends/client-config/"',
  );
  const mfeChildOffset = requestTargetClassifierSource.search(
    /location\.pathname\.startsWith\(\s*"\/\.well-known\/vercel\/microfrontends\/client-config\/",?\s*\)/,
  );
  const mfeRootOffset = requestTargetClassifierSource.indexOf(
    'location.pathname === "/.well-known/vercel/microfrontends"',
  );
  const mfeRootSlashOffset = requestTargetClassifierSource.indexOf(
    'location.pathname === "/.well-known/vercel/microfrontends/"',
  );
  const mfeRootChildOffset = requestTargetClassifierSource.search(
    /location\.pathname\.startsWith\(\s*"\/\.well-known\/vercel\/microfrontends\/"\s*\)/,
  );
  const vercelWellKnownRootOffset = requestTargetClassifierSource.indexOf(
    'location.pathname === "/.well-known/vercel/"',
  );
  const vercelWellKnownResidualOffset = requestTargetClassifierSource.indexOf(
    'location.pathname.startsWith("/.well-known/vercel/")',
  );
  const metricsPathOffset = requestTargetClassifierSource.indexOf(
    'location.pathname === "/_vercel/insights"',
  );
  const pingPathOffset = requestTargetClassifierSource.indexOf(
    'location.pathname === "/_vercel/ping"',
  );
  const genericVercelPathOffset = requestTargetClassifierSource.indexOf(
    "remainingVercelFamily !== null",
  );
  const devtoolsPathOffset = requestTargetClassifierSource.indexOf(
    'location.pathname === "/.well-known/appspecific/com.chrome.devtools.json"',
  );
  const genericWellKnownOffset = requestTargetClassifierSource.indexOf(
    'location.pathname.startsWith("/.well-known/")',
  );
  assert.ok(
    flagsPathOffset >= 0 &&
      flagsSlashOffset >= 0 &&
      flagsChildOffset >= 0 &&
      securityRootOffset >= 0 &&
      securityChildOffset >= 0 &&
      ratePathOffset >= 0 &&
      mfePathOffset >= 0 &&
      mfeSlashOffset >= 0 &&
      mfeChildOffset >= 0 &&
      mfeRootOffset >= 0 &&
      mfeRootSlashOffset >= 0 &&
      mfeRootChildOffset >= 0 &&
      vercelWellKnownRootOffset >= 0 &&
      vercelWellKnownResidualOffset >= 0 &&
      metricsPathOffset >= 0 &&
      pingPathOffset >= 0 &&
      genericVercelPathOffset >= 0 &&
      devtoolsPathOffset >= 0 &&
      genericWellKnownOffset >= 0 &&
      flagsPathOffset < flagsSlashOffset &&
      flagsSlashOffset < flagsChildOffset &&
      flagsChildOffset < vercelWellKnownRootOffset &&
      securityRootOffset < securityChildOffset &&
      securityChildOffset < vercelWellKnownRootOffset &&
      ratePathOffset < vercelWellKnownRootOffset &&
      mfePathOffset < mfeSlashOffset &&
      mfeSlashOffset < mfeChildOffset &&
      mfeChildOffset < mfeRootOffset &&
      mfeRootOffset < mfeRootSlashOffset &&
      mfeRootSlashOffset < mfeRootChildOffset &&
      mfeRootChildOffset < vercelWellKnownRootOffset &&
      vercelWellKnownRootOffset < vercelWellKnownResidualOffset &&
      vercelWellKnownResidualOffset < genericVercelPathOffset &&
      metricsPathOffset < genericVercelPathOffset &&
      pingPathOffset < genericVercelPathOffset &&
      devtoolsPathOffset < genericWellKnownOffset &&
      vercelWellKnownResidualOffset < genericWellKnownOffset,
  );
  assert.doesNotMatch(requestTargetClassifierSource, /wellKnownFamily === "vc-w"/);
  assert.match(runtimeSpec, /phase\.observedAuthSignInRequestCount > 0 \? "auth-post" : "auth-pre"/);
  assert.doesNotMatch(runtimeSpec, /"unexpected-request-failures"/);
  assert.match(
    itemDetailPage,
    /getWrongAnswerDetail\(session\.userId, session\.email, itemId\)/,
  );
  assert.match(itemDetailPage, /if \(!detail\) notFound\(\)/);
  assert.doesNotMatch(runtimeSpec, /cross-account-detail-exact-404/);
  assert.match(qa, /streamed `200` or non-streamed `404`/);
  assert.doesNotMatch(qa, /exact 404 detail UI denial/);
  assert.match(runtimeSpec, /error instanceof Error && error\.name === "TimeoutError"/);
  const secondaryLoginStart = runtimeSpec.indexOf("async function loginWithCredentials");
  const secondaryLoginEnd = runtimeSpec.indexOf(
    "async function requireSyntheticMutationCapacity",
    secondaryLoginStart,
  );
  assert.ok(secondaryLoginStart >= 0 && secondaryLoginEnd > secondaryLoginStart);
  const secondaryLoginSource = runtimeSpec.slice(secondaryLoginStart, secondaryLoginEnd);
  assert.doesNotMatch(secondaryLoginSource, /console\.|process\.stdout|JSON\.stringify/);
  assert.doesNotMatch(secondaryLoginSource, /catch\(\(\) => null\)/);
  assert.match(runtimeSpec, /error instanceof Error/);
  assert.match(runtimeSpec, /static stage failed\|acceptance failed/);
  assert.match(runtimeSpec, /throw error;/);
  assert.match(
    runtimeSpec,
    /capture-saving-work-lock[\s\S]*?capture-source-mutation-release[\s\S]*?capture-source-response-wait[\s\S]*?capture-source-route-remove[\s\S]*?capture-source-receipt[\s\S]*?capture-confirmation-visible[\s\S]*?capture-confirmation-classify[\s\S]*?capture-completed-visible[\s\S]*?capture-completed-announcement/,
  );
  assert.doesNotMatch(runtimeSpec, /staticStage\("capture-text-entry-value"/);
  assert.match(
    runtimeSpec,
    /requireExactSyntheticCaptureValue\(\s*page,\s*input,\s*accountUserId,\s*syntheticCaptureText,\s*\)/,
  );
  assert.doesNotMatch(runtimeSpec, /toHaveValue\(expectedValue/);
  assert.match(runtimeSpec, /const labeledInput = captureForm\.getByLabel/);
  assert.match(runtimeSpec, /const input = captureForm\.locator\("textarea"\)/);
  assert.match(runtimeSpec, /capture-text-entry-labeled-control/);
  assert.match(runtimeSpec, /window\.requestAnimationFrame/);
  assert.match(runtimeSpec, /window\.setTimeout\(\(\) => finishFrame\(false\), 2_000\)/);
  assert.match(runtimeSpec, /setTimeout\(\(\) => finishHost\(false\), 5_000\)/);
  assert.match(
    runtimeSpec,
    /`inverge:review-os:\$\{contract\.accountUserId\}:capture-draft:second`/,
  );
  assert.match(runtimeSpec, /draft\.rawQuestionText !== contract\.expectedValue/);
  assert.match(runtimeSpec, /draft\.rawOcrText !== contract\.expectedValue/);
  assert.match(runtimeSpec, /\{ timeout: 5_000 \}/);
  for (const state of [
    "wrong-control",
    "dom-empty",
    "dom-whitespace-equivalent",
    "dom-different",
    "draft-absent",
    "draft-invalid-json",
    "draft-invalid-shape",
    "draft-question-missing",
    "draft-question-non-string",
    "draft-question-empty",
    "draft-question-whitespace-equivalent",
    "draft-question-different",
    "draft-ocr-missing",
    "draft-ocr-non-string",
    "draft-ocr-empty",
    "draft-ocr-whitespace-equivalent",
    "draft-ocr-different",
    "frame-timeout",
    "contract-unavailable",
  ]) {
    assert.match(runtimeSpec, new RegExp(`capture-text-entry-${state}`));
  }
  const valueClassifierBlock = runtimeSpec.match(
    /async function classifySyntheticCaptureValue[\s\S]*?\n}\n\nfunction throwSyntheticCaptureValueFailure/,
  )?.[0] ?? "";
  assert.notEqual(valueClassifierBlock, "");
  assert.doesNotMatch(
    valueClassifierBlock,
    /console\.|process\.stdout|inputValue|textContent|innerHTML|outerHTML|JSON\.stringify/,
  );
  assert.match(
    runtimeSpec,
    /const immediateState = await classifySyntheticCaptureValue[\s\S]*?await waitForTwoAnimationFrames\(page\)[\s\S]*?const settledState = await classifySyntheticCaptureValue/,
  );
  assert.match(captureFormSource, /function updateCaptureText\(value: string\)/);
  assert.match(
    captureFormSource,
    /rawQuestionText: value,[\s\S]*?rawOcrText: value,[\s\S]*?hasManualCorrection: true,[\s\S]*?ocrConfirmedByLearner: true,[\s\S]*?lowConfidenceFlag: prev\.lowConfidenceFlag \|\| hasLowConfidenceText\(value\)/,
  );
  assert.match(
    captureFormSource,
    /onChange=\{\(event\) => updateCaptureText\(event\.target\.value\)\}/,
  );
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
  const skipLinkProbeBlock = runtimeSpec.match(
    /async function skipLinkProbe[\s\S]*?\n}\n\nasync function keyboardFocusProbe/,
  )?.[0] ?? "";
  assert.notEqual(skipLinkProbeBlock, "");
  assert.match(skipLinkProbeBlock, /topology\.hrefCount === 1/);
  assert.match(skipLinkProbeBlock, /topology\.targetCount === 1/);
  assert.match(skipLinkProbeBlock, /document\.body\.prepend\(sentinel\)/);
  assert.doesNotMatch(skipLinkProbeBlock, /document\.body\.appendChild\(sentinel\)/);
  assert.match(skipLinkProbeBlock, /page\.keyboard\.press\("Tab"\)/);
  assert.match(skipLinkProbeBlock, /page\.waitForFunction\(/);
  assert.match(skipLinkProbeBlock, /active\.getAttribute\("href"\) === href/);
  assert.match(skipLinkProbeBlock, /active\.matches\(":focus-visible"\)/);
  assert.match(skipLinkProbeBlock, /rect\.height >= 44/);
  assert.match(skipLinkProbeBlock, /skip-link-\$\{routeKey\}-first-exact-focus/);
  assert.match(skipLinkProbeBlock, /skip-link-\$\{routeKey\}-focus-visible-settle/);
  assert.match(skipLinkProbeBlock, /skip-link-\$\{routeKey\}-visible-settle/);
  assert.ok(
    skipLinkProbeBlock.indexOf("first-exact-focus") <
      skipLinkProbeBlock.indexOf("focus-visible-settle") &&
      skipLinkProbeBlock.indexOf("focus-visible-settle") <
        skipLinkProbeBlock.indexOf("visible-settle"),
  );
  assert.doesNotMatch(skipLinkProbeBlock, /skip-link-first-visible-focus/);
  assert.match(
    runtimeSpec,
    /skipLinkProbe\(page, route\.pathname, route\.key\)/,
  );
  assert.match(runtimeSpec, /emitSafeFailureDiagnostic\("stage", code\)/);
  assert.match(runtimeSpec, /emitSafeFailureDiagnostic\("assertion", code\)/);
  assert.match(runtimeSpec, /\^\[a-z0-9-\]\{1,64\}\$/);
  assert.match(runtimeSpec, /staticStage\("runtime-preflight"/);
  assert.match(runtimeSpec, /staticStage\("main-runtime-guard"/);
  const keyboardProbeBlock = runtimeSpec.match(
    /async function keyboardFocusProbe[\s\S]*?\n}\n\nasync function closeContext/,
  )?.[0] ?? "";
  assert.notEqual(keyboardProbeBlock, "");
  const keyboardVisibleBlock = keyboardProbeBlock.slice(
    keyboardProbeBlock.indexOf("const visible ="),
    keyboardProbeBlock.indexOf("const candidates ="),
  );
  assert.notEqual(keyboardVisibleBlock, "");
  assert.match(keyboardProbeBlock, /data-s232g-keyboard-boundary/);
  assert.match(keyboardProbeBlock, /const boundaryAnchor = \(element: HTMLElement\)/);
  assert.match(
    keyboardProbeBlock,
    /parent instanceof HTMLDetailsElement && !parent\.open/,
  );
  assert.match(keyboardProbeBlock, /if \(controller === element\) return parent/);
  assert.match(
    keyboardProbeBlock,
    /const startAnchor = boundaryAnchor\(focusables\[0\]\)/,
  );
  assert.match(
    keyboardProbeBlock,
    /const endAnchor = boundaryAnchor\(focusables\.at\(-1\) \?\? focusables\[0\]\)/,
  );
  assert.match(keyboardProbeBlock, /startAnchor\.before\(startBoundary\)/);
  assert.match(keyboardProbeBlock, /endAnchor\.after\(endBoundary\)/);
  const boundaryAnchorBlock = keyboardProbeBlock.slice(
    keyboardProbeBlock.indexOf("const boundaryAnchor ="),
    keyboardProbeBlock.indexOf("const startBoundary ="),
  );
  assert.notEqual(boundaryAnchorBlock, "");
  assert.doesNotMatch(boundaryAnchorBlock, /\.closest\(/);
  assert.doesNotMatch(
    keyboardProbeBlock,
    /focusables\[0\]\.before\(boundary\("start"\)\)|focusables\.at\(-1\)\?\.after\(boundary\("end"\)\)/,
  );
  assert.match(
    keyboardProbeBlock,
    /boundaryInsideClosedDetailsCount: \[startBoundary, endBoundary\]\.filter/,
  );
  assert.match(
    keyboardProbeBlock,
    /element\.closest\("details:not\(\[open\]\)"\) !== null/,
  );
  assert.match(
    keyboardProbeBlock,
    /prepared\.boundaryInsideClosedDetailsCount === 0/,
  );
  assert.match(keyboardProbeBlock, /keyboard-\$\{routeKey\}-forward-start-boundary/);
  assert.match(keyboardProbeBlock, /keyboard-\$\{routeKey\}-forward-end-boundary/);
  assert.match(keyboardProbeBlock, /keyboard-\$\{routeKey\}-reverse-end-boundary/);
  assert.match(keyboardProbeBlock, /keyboard-\$\{routeKey\}-reverse-start-boundary/);
  assert.match(keyboardProbeBlock, /prepared\.positiveTabIndexCount === 0/);
  assert.match(
    keyboardProbeBlock,
    /let ancestor = element\.parentElement;[\s\S]*?ancestor = ancestor\.parentElement/,
  );
  assert.match(
    keyboardProbeBlock,
    /ancestor instanceof HTMLDetailsElement && !ancestor\.open/,
  );
  assert.match(
    keyboardProbeBlock,
    /Array\.from\(ancestor\.children\)\.find\([\s\S]*?child\.tagName === "SUMMARY"/,
  );
  assert.match(keyboardProbeBlock, /if \(controller !== element\)/);
  assert.match(keyboardProbeBlock, /!hiddenByClosedDetails/);
  assert.match(keyboardProbeBlock, /let ancestor = expected\?\.parentElement \?\? null/);
  assert.match(keyboardProbeBlock, /if \(controller !== expected\)/);
  assert.doesNotMatch(
    keyboardVisibleBlock,
    /element\.closest\("details:not\(\[open\]\)"\)/,
  );
  assert.doesNotMatch(
    keyboardProbeBlock,
    /expected\?\.closest\("details:not\(\[open\]\)"\)/,
  );
  assert.match(keyboardProbeBlock, /state\.registered && Number\.isInteger\(state\.order\)/);
  assert.match(keyboardProbeBlock, /state\.order <= expectedOrder/);
  assert.match(keyboardProbeBlock, /state\.order >= expectedOrder/);
  for (const kind of [
    "detached", "closed-details", "disabled", "tabindex",
    "radio", "nested", "hidden", "other",
  ]) {
    assert.match(keyboardProbeBlock, new RegExp(`"${kind}"`));
  }
  assert.match(keyboardProbeBlock, /state\.order >= expectedOrder/);
  assert.match(keyboardProbeBlock, /state\.order <= expectedOrder/);
  assert.match(keyboardProbeBlock, /forward-unregistered-focus/);
  assert.match(keyboardProbeBlock, /forward-skipped-\$\{safeSkippedKind\}/);
  assert.match(keyboardProbeBlock, /forward-backward-jump/);
  assert.match(keyboardProbeBlock, /keyboard-\$\{routeKey\}-focus-evidence-present/);
  assert.match(keyboardProbeBlock, /keyboard-\$\{routeKey\}-focused/);
  assert.match(keyboardProbeBlock, /keyboard-\$\{routeKey\}-focus-visible/);
  assert.match(keyboardProbeBlock, /keyboard-\$\{routeKey\}-in-viewport/);
  assert.match(keyboardProbeBlock, /keyboard-\$\{routeKey\}-interactive-control/);
  assert.doesNotMatch(keyboardProbeBlock, /keyboard-\$\{routeKey\}-visible-focus-control/);
  for (const route of S232G_ROUTES) {
    for (const suffix of [
      "focus-evidence-present",
      "focused",
      "focus-visible",
      "in-viewport",
      "interactive-control",
      "boundaries-exposed",
    ]) {
      assert.match(`keyboard-${route.key}-${suffix}`, /^[a-z0-9-]{1,64}$/);
    }
    assert.match(`keyboard-${route.key}-viewport-settle`, /^[a-z0-9-]{1,64}$/);
  }
  const keyboardViewportSettleStart = keyboardProbeBlock.indexOf(
    "await staticStage(`keyboard-${routeKey}-viewport-settle`",
  );
  const keyboardViewportSettleEnd = keyboardProbeBlock.indexOf(
    "focusedEvidence = await staticStage",
    keyboardViewportSettleStart,
  );
  assert.ok(
    keyboardViewportSettleStart >= 0 &&
      keyboardViewportSettleEnd > keyboardViewportSettleStart,
  );
  const keyboardViewportSettleBlock = keyboardProbeBlock.slice(
    keyboardViewportSettleStart,
    keyboardViewportSettleEnd,
  );
  assert.match(keyboardViewportSettleBlock, /const active = document\.activeElement/);
  assert.match(
    keyboardViewportSettleBlock,
    /active\.getAttribute\("data-s232g-keyboard-probe"\) !== "target"/,
  );
  assert.match(keyboardViewportSettleBlock, /rect\.width > 0/);
  assert.match(keyboardViewportSettleBlock, /rect\.height > 0/);
  assert.match(keyboardViewportSettleBlock, /rect\.bottom > 0/);
  assert.match(keyboardViewportSettleBlock, /rect\.right > 0/);
  assert.match(keyboardViewportSettleBlock, /rect\.top < window\.innerHeight/);
  assert.match(keyboardViewportSettleBlock, /rect\.left < window\.innerWidth/);
  assert.match(keyboardViewportSettleBlock, /polling: "raf", timeout: 2_000/);
  assert.doesNotMatch(
    keyboardViewportSettleBlock,
    /scrollIntoView|scrollTo|scrollBy|setViewportSize|emulateMedia|classList|\.style/,
  );
  assert.ok(
    keyboardProbeBlock.indexOf("forward-target-exact") < keyboardViewportSettleStart &&
      keyboardViewportSettleStart < keyboardViewportSettleEnd,
  );
  assert.doesNotMatch(keyboardProbeBlock, /forward-order-exact/);
  assert.match(keyboardProbeBlock, /finally \{/);
  assert.match(
    keyboardProbeBlock,
    /querySelectorAll\("\[data-s232g-keyboard-boundary\]"\)[\s\S]*?element\.remove\(\)/,
  );
  assert.match(keyboardProbeBlock, /if \(!failed\) throw error/);
  assert.doesNotMatch(keyboardProbeBlock, /keyboard-forward-complete-no-trap/);
  assert.doesNotMatch(keyboardProbeBlock, /prepared\.count \+ 8/);
  assert.doesNotMatch(keyboardProbeBlock, /completedForwardCycle|completedReverseCycle/);
  assert.match(
    runtimeSpec,
    /keyboardFocusProbe\(page, route\.keyboardSelector, route\.key\)/,
  );
  assert.match(
    runtimeSpec,
    /`route-\$\{route\.key\}-\$\{viewport\.key\}-ready`/,
  );
  assert.match(
    runtimeSpec,
    /`route-\$\{route\.key\}-\$\{viewport\.key\}-clipped-core-content`/,
  );
  const layoutProbeBlock = runtimeSpec.match(
    /async function layoutProbe[\s\S]*?\n}\n\nasync function skipLinkProbe/,
  )?.[0] ?? "";
  assert.notEqual(layoutProbeBlock, "");
  assert.match(
    layoutProbeBlock,
    /let ancestor = element\.parentElement;[\s\S]*?ancestor = ancestor\.parentElement/,
  );
  assert.match(
    layoutProbeBlock,
    /ancestor instanceof HTMLDetailsElement && !ancestor\.open/,
  );
  assert.match(
    layoutProbeBlock,
    /Array\.from\(ancestor\.children\)\.find\([\s\S]*?child\.tagName === "SUMMARY"/,
  );
  assert.match(layoutProbeBlock, /if \(!controller\?\.contains\(element\)\)/);
  assert.doesNotMatch(layoutProbeBlock, /if \(controller !== element\)/);
  assert.match(layoutProbeBlock, /!hiddenByClosedDetails/);
  assert.match(layoutProbeBlock, /rect\.left < -1/);
  assert.match(
    layoutProbeBlock,
    /rect\.right > document\.documentElement\.clientWidth \+ 1/,
  );
  assert.match(
    runtimeSpec,
    /`route-\$\{route\.key\}-\$\{S232G_WIDTH_EQUIVALENT_VIEWPORT\.key\}-clipped-core-content`/,
  );
  for (const route of S232G_ROUTES) {
    for (const viewport of S232G_VIEWPORTS) {
      assert.match(`route-${route.key}-${viewport.key}-ready`, /^[a-z0-9-]{1,64}$/);
    }
    for (const viewport of [...S232G_VIEWPORTS, S232G_WIDTH_EQUIVALENT_VIEWPORT]) {
      assert.match(
        `route-${route.key}-${viewport.key}-clipped-core-content`,
        /^[a-z0-9-]{1,64}$/,
      );
    }
  }
  assert.doesNotMatch(runtimeSpec, /"route-ready"/);
  assert.doesNotMatch(runtimeSpec, /"route-clipped-core-content"/);
  assert.doesNotMatch(runtimeSpec, /"width-equivalent-clipping"/);
  assert.match(
    runtimeSpec,
    /`calculator-step-\$\{viewport\.key\}-min-height`/,
  );
  assert.match(
    runtimeSpec,
    /`calculator-step-\$\{viewport\.key\}-shell-width`/,
  );
  assert.doesNotMatch(runtimeSpec, /"calculator-step-shell-geometry"/);
  for (const viewport of [...S232G_VIEWPORTS, S232G_WIDTH_EQUIVALENT_VIEWPORT]) {
    assert.match(`calculator-step-${viewport.key}-min-height`, /^[a-z0-9-]{1,64}$/);
    assert.match(`calculator-step-${viewport.key}-shell-width`, /^[a-z0-9-]{1,64}$/);
  }
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
