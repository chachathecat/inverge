import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import {
  disposePreviewResponse,
  isPreviewJsonObject,
  PREVIEW_REQUEST_CODE_PREFIXES,
  previewRequestFailureCode,
  previewResponseMetadataFailureCode,
} from "../scripts/support/s232h2-preview-response.mjs";

const read = (path) => readFileSync(path, "utf8");
const workflow = read(".github/workflows/s232h2-runtime.yml");
const ephemeralAccounts = read("scripts/s232h2-ephemeral-accounts.ts");
const exactFixture = read("scripts/support/s232h2-exact-fixture.ts");
const previewResponseSupport = read(
  "scripts/support/s232h2-preview-response.mjs",
);
const spec = read("tests/e2e/s232h2-production-v3-visual.spec.ts");
const authenticatedRuntime = read(
  "tests/e2e/support/authenticated-runtime.ts",
);
const sourceAuditRoute = read("app/api/os/visual-source-audit/route.ts");
const readOnlyRequest = read("lib/review-os/read-only-request.ts");
const reviewOsRepository = read("lib/review-os/repository.ts");
const reviewOsServer = read("lib/review-os/server.ts");
const reviewOsService = read("lib/review-os/service.ts");
const baselineSha = "35836d419161d7cfe55e3e3c088fcc4d66376a7d";
const snapshotDirectory =
  "tests/e2e/s232h2-production-v3-visual.spec.ts-snapshots";

const figmaSnapshots = [
  {
    file: "figma-mobile-ledger-chromium-linux.png",
    width: 390,
    height: 844,
    sha256: "afd49546f0554715ed4920dfc38e5913cde30d7bd52a7bece25442f4e33a07b1",
  },
  {
    file: "figma-desktop-ledger-chromium-linux.png",
    width: 1440,
    height: 1024,
    sha256: "ca596871993b272f81085ac586d3676536a2da6b7d009b4de14e95b722e9ac02",
  },
  {
    file: "figma-mobile-calculator-chromium-linux.png",
    width: 390,
    height: 844,
    sha256: "f3e9e7d3218f39eb2ef1e0d54e991346d31ddb9b9beb1e8ef3f7d4b3faa9e6a7",
  },
];

const requiredRoutes = [
  "/",
  "/login",
  "/app?mode=second",
  "/app/capture?mode=second",
  "/answer-review?mode=second",
  "/app/review?mode=second",
  "/app/notes?mode=second",
  "/app/items/",
  "/app/session?mode=second",
  "/app/agenda?mode=second",
  "/app/weekly?mode=second",
  "/app/write?mode=second",
  "/app/calculator?mode=second&context=practice&focus=casio",
];

function pngDimensions(buffer) {
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(buffer.subarray(12, 16).toString("ascii"), "IHDR");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function blockBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0, `missing source marker: ${start}`);
  assert.ok(
    endIndex > startIndex,
    `missing source marker after ${start}: ${end}`,
  );
  return source.slice(startIndex, endIndex);
}

function readSourceTree(directory) {
  const sources = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      sources.push(readSourceTree(path));
    } else if (
      entry.isFile() &&
      /\.(?:js|mjs|sql|ts|tsx)$/.test(entry.name)
    ) {
      sources.push(read(path));
    }
  }
  return sources.join("\n");
}

test("workflow keeps exact-head and fixed-baseline provenance while splitting the gate", () => {
  assert.match(workflow, /agent\/figma-v3-production-routes/);
  assert.ok(
    workflow.includes(`<!-- run-s232h2-visual-e2e baseline=${baselineSha} -->`),
  );
  assert.ok(workflow.includes(`E2E_BASELINE_SHA: ${baselineSha}`));
  assert.match(
    workflow,
    /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/,
  );
  assert.match(
    workflow,
    /E2E_RUNNER_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/,
  );
  assert.match(
    workflow,
    /E2E_TARGET_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/,
  );
  assert.match(
    workflow,
    /deployments\?sha=\$\{target_sha\}&environment=Preview/,
  );
  assert.match(workflow, /api\/runtime\/version/);
  assert.match(
    workflow,
    /discover_preview "\$\{E2E_RUNNER_SHA\}"[^\n]*&[\s\S]*?discover_preview "\$\{E2E_BASELINE_SHA\}"[^\n]*&/,
  );
  assert.match(workflow, /wait "\$\{pr2_pid\}"/);
  assert.match(workflow, /wait "\$\{baseline_pid\}"/);
  assert.match(workflow, /git merge-base/);
  assert.match(workflow, /\^\{tree\}/);
  assert.match(workflow, /verify_runtime_sha "\$\{E2E_BASE_URL\}"/);
  assert.match(workflow, /verify_runtime_sha "\$\{E2E_BASELINE_URL\}"/);
  assert.match(workflow, /current_pr_head/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /deployments: read/);
  assert.match(workflow, /pull-requests: read/);
  const jobTimeout = Number(
    workflow.match(/timeout-minutes:\s*(\d+)/)?.[1] ?? 0,
  );
  const previewDiscoveryBound = Number(
    workflow.match(/local deadline=\$\(\(SECONDS \+ (\d+)\)\)/)?.[1] ?? 0,
  );
  const gateBounds = [
    ...workflow.matchAll(/timeout --signal=TERM --kill-after=10s (\d+)s/g),
  ].map((match) => Number(match[1]));
  assert.deepEqual(gateBounds, [180, 720, 900]);
  assert.ok(
    jobTimeout * 60 >=
      previewDiscoveryBound +
        gateBounds.reduce((sum, seconds) => sum + seconds, 0) +
        600,
    "the job must retain setup, cleanup, validation, and upload headroom",
  );
  assert.doesNotMatch(
    workflow,
    /contents: write|pull-requests: write|issues: write/,
  );

  const contractCommand = blockBetween(
    workflow,
    "Check the focused visual-gate contract",
    "Provision runner-only ephemeral S232H2 accounts",
  );
  assert.match(
    contractCommand,
    /node --test tests\/s232h2-production-v3-visual-contract\.test\.mjs/,
  );
  assert.doesNotMatch(contractCommand, /screenshot-boundary-policy/);

  const contractIndex = workflow.indexOf(
    "Check the focused visual-gate contract",
  );
  const provisionIndex = workflow.indexOf(
    "Provision runner-only ephemeral S232H2 accounts",
  );
  const browserIndex = workflow.indexOf("Install Playwright browser");
  const privacyIndex = workflow.indexOf(
    "Run privacy and auth source gate without screenshots",
  );
  const a11yIndex = workflow.indexOf(
    "Run bounded production V3 accessibility gate",
  );
  const visualIndex = workflow.indexOf(
    "Run one-pass production V3 visual and Figma gate",
  );
  const manifestIndex = workflow.indexOf(
    "Validate the isolated synthetic screenshot manifest",
  );
  assert.ok(
    contractIndex >= 0 &&
      provisionIndex > contractIndex &&
      browserIndex > provisionIndex &&
      privacyIndex > browserIndex &&
      a11yIndex > privacyIndex &&
      visualIndex > a11yIndex &&
      manifestIndex > visualIndex,
  );
  assert.match(workflow, /--grep "@privacy"/);
  assert.match(workflow, /--grep "@a11y"/);
  assert.match(workflow, /--grep "@visual"/);
  assert.match(workflow, /timeout[^\n]*180s/);
  assert.match(workflow, /timeout[^\n]*720s/);
  assert.match(workflow, /timeout[^\n]*900s/);
  assert.doesNotMatch(workflow, /#624|s232g|workflow_dispatch|rerun|re-run/i);
});

test("workflow provisions exactly two runner-only candidates and always cleans them", () => {
  const provisionStep = blockBetween(
    workflow,
    "Provision runner-only ephemeral S232H2 accounts",
    "Install Playwright browser",
  );
  const privacyStep = blockBetween(
    workflow,
    "Run privacy and auth source gate without screenshots",
    "Run bounded production V3 accessibility gate",
  );
  const generatedCredentialNames = [
    "E2E_VISUAL_USER_EMAIL",
    "E2E_VISUAL_USER_PASSWORD",
    "E2E_USER_B_EMAIL",
    "E2E_USER_B_PASSWORD",
  ];
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\.E2E_/);
  assert.doesNotMatch(workflow, /\bE2E_USER_A_(?:EMAIL|PASSWORD)\b/);
  assert.doesNotMatch(workflow, /\bE2E_USER_EMAIL\b/);
  assert.doesNotMatch(workflow, /\bE2E_USER_PASSWORD\b/);
  for (const name of generatedCredentialNames) {
    assert.doesNotMatch(workflow, new RegExp(`\\b${name}:`));
  }
  assert.match(
    provisionStep,
    /run: npx tsx scripts\/s232h2-ephemeral-accounts\.ts provision/,
  );
  assert.match(
    provisionStep,
    /S232H2_EPHEMERAL_STATE_PATH: \$\{\{ runner\.temp \}\}\/s232h2-ephemeral-state\.json/,
  );
  assert.match(
    privacyStep,
    /S232H2_VISUAL_PROOF_PATH: \$\{\{ runner\.temp \}\}\/s232h2-visual-proof\.json/,
  );
  assert.doesNotMatch(
    privacyStep,
    /S232H2_SUPABASE_ADMIN_KEY|S232H2_EPHEMERAL_STATE_PATH/,
  );
  for (const stepName of [
    "Run bounded production V3 accessibility gate",
    "Run one-pass production V3 visual and Figma gate",
  ]) {
    const start = workflow.indexOf(stepName);
    const end = workflow.indexOf("\n      - name:", start + stepName.length);
    const step = workflow.slice(start, end < 0 ? undefined : end);
    assert.match(step, /S232H2_VISUAL_PROOF_PATH/);
    for (const name of generatedCredentialNames) {
      assert.doesNotMatch(step, new RegExp(`\\b${name}:`));
    }
    assert.doesNotMatch(
      step,
      /S232H2_SUPABASE_ADMIN_KEY|S232H2_EPHEMERAL_STATE_PATH/,
    );
  }

  const adminSecretExpression =
    "${{ secrets.SUPABASE_SECRET_KEY || secrets.SUPABASE_SERVICE_ROLE_KEY }}";
  assert.equal(workflow.split(adminSecretExpression).length - 1, 2);
  const jobEnvironment = blockBetween(workflow, "    env:", "    steps:");
  assert.doesNotMatch(
    jobEnvironment,
    /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|S232H2_SUPABASE_ADMIN_KEY/,
  );
  assert.ok(provisionStep.includes(adminSecretExpression));

  const cleanupStep = blockBetween(
    workflow,
    "Revoke and delete runner-only ephemeral S232H2 accounts",
    "Remove the ephemeral visual-account proof",
  );
  assert.match(cleanupStep, /if: \$\{\{ always\(\) \}\}/);
  assert.ok(cleanupStep.includes(adminSecretExpression));
  assert.match(
    cleanupStep,
    /S232H2_EPHEMERAL_STATE_PATH: \$\{\{ runner\.temp \}\}\/s232h2-ephemeral-state\.json/,
  );
  assert.match(
    cleanupStep,
    /run: npx tsx scripts\/s232h2-ephemeral-accounts\.ts cleanup/,
  );
  assert.doesNotMatch(cleanupStep, /continue-on-error/);
  assert.ok(
    workflow.indexOf("Upload 28 synthetic and Figma-reference PNGs") <
      workflow.indexOf("Revoke and delete runner-only ephemeral S232H2 accounts"),
  );
  assert.ok(
    workflow.indexOf("Revoke and delete runner-only ephemeral S232H2 accounts") <
      workflow.indexOf("Remove the ephemeral visual-account proof"),
  );
  assert.match(workflow, /Remove the ephemeral visual-account proof/);
  assert.match(workflow, /rm -f -- "\$\{S232H2_VISUAL_PROOF_PATH\}"/);

  const successfulArtifact = blockBetween(
    workflow,
    "Upload 28 synthetic and Figma-reference PNGs and one manifest",
    "Revoke and delete runner-only ephemeral S232H2 accounts",
  );
  assert.doesNotMatch(
    successfulArtifact,
    /runner\.temp|VISUAL_PROOF|EPHEMERAL_STATE|GITHUB_ENV|SUPABASE|EMAIL|PASSWORD/,
  );
});

test("runner API audit and browser visual contexts keep distinct bypass behavior", () => {
  const runnerSession = blockBetween(
    ephemeralAccounts,
    "async function createPreviewSession",
    "async function readPreviewSnapshot",
  );
  const runnerContext = blockBetween(
    runnerSession,
    "request.newContext({",
    "  });\n  try {",
  );
  assert.match(
    runnerContext,
    /"x-vercel-protection-bypass": preview\.bypassSecret/,
  );
  assert.doesNotMatch(runnerContext, /x-vercel-set-bypass-cookie/);
  assert.doesNotMatch(ephemeralAccounts, /x-vercel-set-bypass-cookie/);

  for (const request of [
    /runPreviewRequest\("runtime-version", \(\) =>\s*context\.get\("\/api\/runtime\/version"/,
    /runPreviewRequest\("sign-in", \(\) =>\s*context\.post\("\/api\/auth\/sign-in"/,
    /runPreviewRequest\("session", \(\) =>\s*context\.get\("\/api\/auth\/session"/,
  ]) {
    assert.match(runnerSession, request);
  }
  assert.match(
    runnerSession,
    /context\.get\("\/api\/auth\/session", \{\s*maxRedirects: 0/,
  );

  const sourceAudit = blockBetween(
    ephemeralAccounts,
    "async function readPreviewSnapshot",
    "function assertPreviewPrimaryExact",
  );
  assert.match(
    sourceAudit,
    /runPreviewRequest\("source-audit", \(\) =>\s*context\.get/,
  );
  assert.match(
    sourceAudit,
    /runPreviewRequest\(requestLabel, \(\) =>\s*context\.get/,
  );

  const browserHeaders = blockBetween(
    authenticatedRuntime,
    "export const protectionHeaders",
    "export async function establishProtectedPreviewSession",
  );
  assert.match(
    browserHeaders,
    /"x-vercel-protection-bypass": vercelBypassSecret/,
  );
  assert.match(
    browserHeaders,
    /"x-vercel-set-bypass-cookie": "true"/,
  );
  const browserBootstrap = blockBetween(
    authenticatedRuntime,
    "export async function establishProtectedPreviewSession",
    "type RuntimeSafetyOptions",
  );
  assert.match(browserBootstrap, /headers: protectionHeaders/);
  assert.match(browserBootstrap, /cookieRedirectStatuses/);
  assert.match(browserBootstrap, /headersArray\(\)/);
  assert.match(browserBootstrap, /page\.context\(\)\.cookies/);
  assert.match(browserBootstrap, /const cookieProofResponse/);

  const visualContext = blockBetween(
    spec,
    "async function newPreviewContext",
    "function allErrorCounts",
  );
  assert.match(visualContext, /extraHTTPHeaders: \{\s*\.\.\.protectionHeaders/);
});

test("Preview response validation is request-specific, value-safe, and privacy-safe", async () => {
  const runnerSession = blockBetween(
    ephemeralAccounts,
    "async function createPreviewSession",
    "async function readPreviewSnapshot",
  );
  const sourceAudit = blockBetween(
    ephemeralAccounts,
    "async function readPreviewSnapshot",
    "function assertPreviewPrimaryExact",
  );
  const requestContracts = [
    ["runtime-version", "S232H2_PREVIEW_RUNTIME_VERSION"],
    ["sign-in", "S232H2_PREVIEW_SIGN_IN"],
    ["session", "S232H2_PREVIEW_SESSION"],
    ["source-audit", "S232H2_PREVIEW_SOURCE_AUDIT"],
    ["rls-owner-probe", "S232H2_PREVIEW_RLS_OWNER_PROBE"],
    [
      "rls-cross-account-probe",
      "S232H2_PREVIEW_RLS_CROSS_ACCOUNT_PROBE",
    ],
  ];
  assert.deepEqual(
    Object.entries(PREVIEW_REQUEST_CODE_PREFIXES),
    requestContracts,
  );
  for (const [label, prefix] of requestContracts) {
    for (const [status, contentType, kind] of [
      [302, "text/html", "HTTP_REDIRECT"],
      [401, "application/json", "HTTP_CLIENT_ERROR"],
      [503, "application/json", "HTTP_SERVER_ERROR"],
      [204, "application/json", "HTTP_UNEXPECTED_STATUS"],
      [200, undefined, "CONTENT_TYPE_MISSING"],
      [200, "text/html", "CONTENT_TYPE_NON_JSON"],
      [200, "application/problem+json", "CONTENT_TYPE_NON_JSON"],
    ]) {
      assert.equal(
        previewResponseMetadataFailureCode(label, status, contentType),
        `${prefix}_${kind}`,
      );
    }
    assert.equal(
      previewResponseMetadataFailureCode(
        label,
        200,
        " Application/JSON ; charset=utf-8",
      ),
      null,
    );
    assert.equal(
      previewRequestFailureCode(label, "REQUEST_FAILED"),
      `${prefix}_REQUEST_FAILED`,
    );
    assert.equal(
      previewRequestFailureCode(label, "JSON_INVALID"),
      `${prefix}_JSON_INVALID`,
    );
    assert.equal(
      previewRequestFailureCode(label, "JSON_VALUE_INVALID"),
      `${prefix}_JSON_VALUE_INVALID`,
    );
  }
  assert.equal(isPreviewJsonObject({ ok: true }), true);
  assert.equal(isPreviewJsonObject(null), false);
  assert.equal(isPreviewJsonObject([]), false);
  assert.equal(isPreviewJsonObject("json"), false);

  const failureFactory = blockBetween(
    previewResponseSupport,
    "export function previewRequestFailureCode",
    "/**\n * @param {PreviewRequestLabel} requestLabel\n * @param {number} status",
  );
  assert.match(
    failureFactory,
    /PREVIEW_REQUEST_CODE_PREFIXES\[requestLabel\]/,
  );
  assert.doesNotMatch(
    failureFactory,
    /error|status|contentType|response|body|headers|location|url|email|password|cookie|jwt|account|supabase/i,
  );

  const responseValidation = blockBetween(
    ephemeralAccounts,
    "async function runPreviewRequest",
    "async function createPreviewSession",
  );
  const metadataIndex = responseValidation.indexOf(
    "previewResponseMetadataFailureCode(",
  );
  const contentTypeIndex = responseValidation.indexOf(
    'response.headers()["content-type"]',
  );
  const jsonIndex = responseValidation.indexOf("value = await response.json()");
  const finallyIndex = responseValidation.indexOf("} finally {");
  const disposeIndex = responseValidation.indexOf(
    "await disposePreviewResponse(response)",
  );
  assert.ok(
    metadataIndex >= 0 &&
      contentTypeIndex > metadataIndex &&
      jsonIndex > contentTypeIndex &&
      finallyIndex > jsonIndex &&
      disposeIndex > finallyIndex,
  );
  assert.match(responseValidation, /if \(!isPreviewJsonObject\(value\)\)/);
  assert.match(responseValidation, /catch \{\s*fail\(/);
  assert.doesNotMatch(
    responseValidation,
    /response\.(?:body|text|url|statusText)\(|headersArray\(|\blocation\b|set-cookie|console\.|process\.(?:stdout|stderr)|JSON\.stringify/i,
  );
  assert.doesNotMatch(ephemeralAccounts, /S232H2_PREVIEW_JSON_INVALID/);

  let disposeCalls = 0;
  await disposePreviewResponse({
    async dispose() {
      disposeCalls += 1;
    },
  });
  assert.equal(disposeCalls, 1);
  await assert.doesNotReject(() =>
    disposePreviewResponse({
      async dispose() {
        throw new Error("bounded disposal failure");
      },
    }),
  );

  assert.match(
    runnerSession,
    /readPreviewJson\(\s*versionResponse,\s*"runtime-version"/,
  );
  assert.match(
    runnerSession,
    /readPreviewJson\(signInResponse, "sign-in"\)/,
  );
  assert.match(
    runnerSession,
    /readPreviewJson\(sessionResponse, "session"\)/,
  );
  assert.match(
    sourceAudit,
    /readPreviewJson\(response, "source-audit"\)/,
  );
  assert.match(sourceAudit, /readPreviewJson\(response, requestLabel\)/);

  const rlsCalls = blockBetween(
    ephemeralAccounts,
    "async function verifyPreviewJwtAndRls",
    "async function writeRunnerState",
  );
  assert.match(rlsCalls, /"rls-owner-probe"/);
  assert.match(rlsCalls, /"rls-cross-account-probe"/);
});

test("artifact identity and network quiescence stay privacy-safe and fail-closed", () => {
  const runtimeMonitor = blockBetween(
    spec,
    "function monitorPageRuntime",
    "function visualAuditRequestHeaders",
  );
  assert.match(runtimeMonitor, /headers\["next-router-prefetch"\] === "1"/);
  assert.doesNotMatch(runtimeMonitor, /next-router-prefetch[\s\S]*?=== "2"/);
  assert.match(runtimeMonitor, /same-origin-request-failure/);
  assert.match(runtimeMonitor, /same-origin-http-error/);

  const boundary = blockBetween(
    spec,
    "async function inspectSyntheticArtifactBoundary",
    "async function captureSyntheticScreenshot",
  );
  const rawEmail = blockBetween(
    boundary,
    "const rawEmailOutsideMask",
    "const rawCredentialArtifactCount",
  );
  assert.match(
    rawEmail,
    /element instanceof HTMLScriptElement &&\s*!element\.hasAttribute\("src"\)/,
  );
  assert.match(
    rawEmail,
    /normalizedOwnText\.startsWith\(\s*"\(self\.__next_f=self\.__next_f\|\|\[\]\)\.push\("/,
  );
  assert.match(
    rawEmail,
    /normalizedOwnText\.startsWith\("self\.__next_f\.push\("\)/,
  );
  assert.match(
    rawEmail,
    /const ownText = isInlineNextFlightTransport \? "" : directOwnText/,
  );
  assert.doesNotMatch(rawEmail, /HTMLScriptElement\s*\? ""/);
  assert.match(rawEmail, /Array\.from\(element\.attributes\)/);
  assert.match(rawEmail, /element instanceof HTMLInputElement/);
  assert.match(rawEmail, /\[attributeText, ownText, value\]/);
  assert.match(
    boundary,
    /html\.includes\(password\) \|\| serializedValues\.includes\(password\)/,
  );
  assert.doesNotMatch(rawEmail, /querySelectorAll<HTMLElement>\("(?!body \*)/);

  const settle = blockBetween(
    spec,
    "async function settleRuntimeMonitors",
    "async function verifyRuntimeVersion",
  );
  assert.match(
    settle,
    /waitForLoadState\("networkidle", \{ timeout: 10_000 \}\)/,
  );
  assert.doesNotMatch(settle, /\.catch\(/);
  const routeAssertion = blockBetween(
    spec,
    "function assertRequiredRoute",
    "async function gotoRequiredRoute",
  );
  assert.match(routeAssertion, /observed\.pathname === expected\.pathname/);
  assert.match(routeAssertion, /observed\.searchParams\.get\(key\) === value/);
  const requiredRoute = blockBetween(
    spec,
    "async function gotoRequiredRoute",
    "async function gotoRequiredAuditRoute",
  );
  assert.match(requiredRoute, /await page\.goto\(requestedPath/);
  assert.match(requiredRoute, /await waitForStableRender\(page\)/);
  assert.match(requiredRoute, /assertRequiredRoute\(page, requestedPath\)/);
  assert.doesNotMatch(requiredRoute, /settleRuntimeMonitors/);
  const requiredAuditRoute = blockBetween(
    spec,
    "async function gotoRequiredAuditRoute",
    "async function visibleTargetFailures",
  );
  assert.match(
    requiredAuditRoute,
    /await gotoRequiredRoute\(page, requestedPath\);[\s\S]*?await settleRuntimeMonitors\(page\);[\s\S]*?assertRequiredRoute\(page, requestedPath\)/,
  );
  assert.doesNotMatch(requiredAuditRoute, /\bcatch\b/);

  const privacyRouteProbe = blockBetween(
    spec,
    "const ownerRead = await readRlsProbe",
    "const ownerReadAgain = await readRlsProbe",
  );
  assert.match(
    privacyRouteProbe,
    /gotoRequiredRoute\(selected\.page, "\/app\?mode=second"\)/,
  );
  assert.doesNotMatch(privacyRouteProbe, /gotoRequiredAuditRoute/);
  assert.match(
    privacyRouteProbe,
    /S232H2_PRIVACY_DOM_NAVIGATION_FAILED/,
  );
  assert.match(
    privacyRouteProbe,
    /data-s224v-surface="\/app"[\s\S]*?data-s232d5-today-page="single-priority"/,
  );
  assert.match(privacyRouteProbe, /expectedSurface\.waitFor\(\{ state: "visible" \}\)/);
  assert.match(privacyRouteProbe, /await expectedSurface\.count\(\)[\s\S]*?\.toBe\(1\)/);
  assert.match(privacyRouteProbe, /S232H2_PRIVACY_DOM_SURFACE_INVALID/);
  assert.match(privacyRouteProbe, /S232H2_PRIVACY_DOM_CANARY_READ_FAILED/);
  assert.doesNotMatch(privacyRouteProbe, /console\.|response\.body|page\.url\(\)/);

  assert.equal(
    [...spec.matchAll(/\bgotoRequiredRoute\(/g)].length,
    3,
    "base navigation is limited to its definition, the audit wrapper, and the privacy probe",
  );
  assert.equal(
    [...spec.matchAll(/\bgotoRequiredAuditRoute\(/g)].length,
    12,
    "all eleven audited navigation sites must retain strict quiescence",
  );
  const calculatorReload = blockBetween(
    spec,
    "async function advanceCalculatorToCasioInput",
    "async function completeCalculatorRoutine",
  );
  assert.match(
    calculatorReload,
    /page\.reload[\s\S]*?waitForStableRender[\s\S]*?settleRuntimeMonitors/,
  );
  const captureReload = blockBetween(
    spec,
    "async function prepareCaptureExtractionPreview",
    "async function prepareAnswerReviewResult",
  );
  assert.match(
    captureReload,
    /page\.reload[\s\S]*?waitForStableRender[\s\S]*?settleRuntimeMonitors/,
  );
});

test("ephemeral runner is pinned to the exact project, repository, PR, and head", () => {
  for (const contract of [
    /S232H2_EPHEMERAL_PROJECT_REF = "vajcduseyicjhyhrclax"/,
    /S232H2_EPHEMERAL_PROJECT_URL =\s*`https:\/\/\$\{S232H2_EPHEMERAL_PROJECT_REF\}\.supabase\.co`/,
    /S232H2_EXPECTED_REPOSITORY = "chachathecat\/inverge"/,
    /S232H2_EXPECTED_PR_NUMBER = 627/,
  ]) {
    assert.match(ephemeralAccounts, contract);
  }
  assert.match(
    ephemeralAccounts,
    /createClient\(S232H2_EPHEMERAL_PROJECT_URL, adminKey/,
  );
  assert.doesNotMatch(
    ephemeralAccounts,
    /process\.env\.(?:NEXT_PUBLIC_)?SUPABASE_(?:URL|PROJECT)|NEXT_PUBLIC_SUPABASE|S232H2_SUPABASE_URL/,
  );

  const config = blockBetween(
    ephemeralAccounts,
    "async function readRunnerConfig",
    "function createAdminClient",
  );
  for (const name of [
    "S232H2_SUPABASE_ADMIN_KEY",
    "GITHUB_RUN_ID",
    "GITHUB_RUN_ATTEMPT",
    "GITHUB_REPOSITORY",
    "GITHUB_EVENT_PATH",
    "RUNNER_TEMP",
    "E2E_RUNNER_SHA",
    "S232H2_EPHEMERAL_STATE_PATH",
  ]) {
    assert.ok(config.includes(`requiredEnv("${name}")`), `missing ${name}`);
  }
  assert.match(
    config,
    /resolve\(statePath\) !== resolve\(runnerTemp, "s232h2-ephemeral-state\.json"\)/,
  );
  assert.match(config, /event\.repository\?\.full_name/);
  assert.match(config, /event\.pull_request\?\.number/);
  assert.match(config, /event\.pull_request\.head\?\.sha !== headSha/);
  assert.match(config, /event\.pull_request\.head\.repo\?\.full_name/);

  const productionSurfaces = [
    readSourceTree("app/api"),
    readSourceTree("supabase/migrations"),
  ].join("\n");
  assert.doesNotMatch(
    productionSurfaces,
    /S232H2_SUPABASE_ADMIN_KEY|S232H2_EPHEMERAL_STATE_PATH|s232h2-ephemeral-accounts|s232h2_test|s232h2-production-v3-visual/,
  );
  assert.doesNotMatch(
    ephemeralAccounts,
    /NextRequest|NextResponse|export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE)\b|auth\.users|\.rpc\(|\b(?:create|alter|drop)\s+policy\b|row level security/i,
  );
});

test("ephemeral credentials are random, masked first, and published only to job env", () => {
  const credentialBuilder = blockBetween(
    ephemeralAccounts,
    "function newCredential",
    "function buildMarker",
  );
  const emailIndex = credentialBuilder.indexOf("const email =");
  const emailMaskIndex = credentialBuilder.indexOf("maskImmediately(email)");
  const passwordIndex = credentialBuilder.indexOf("const password =");
  const passwordMaskIndex = credentialBuilder.indexOf(
    "maskImmediately(password)",
  );
  assert.ok(
    emailIndex >= 0 &&
      emailMaskIndex > emailIndex &&
      passwordIndex > emailMaskIndex &&
      passwordMaskIndex > passwordIndex,
  );
  assert.match(credentialBuilder, /randomBytes\(8\)\.toString\("hex"\)/);
  assert.match(
    credentialBuilder,
    /randomBytes\(36\)\.toString\("base64url"\)/,
  );

  const publisher = blockBetween(
    ephemeralAccounts,
    "export async function publishMaskedCredentials",
    "async function deleteByUser",
  );
  assert.match(publisher, /requiredEnv\("GITHUB_ENV"\)/);
  assert.ok(
    publisher.indexOf("maskImmediately(value)") <
      publisher.indexOf("await appendFile"),
  );
  assert.deepEqual(
    [
      ...publisher.matchAll(
        /`(E2E_(?:VISUAL_USER|USER_B)_(?:EMAIL|PASSWORD))=\$\{/g,
      ),
    ].map((match) => match[1]),
    [
      "E2E_VISUAL_USER_EMAIL",
      "E2E_VISUAL_USER_PASSWORD",
      "E2E_USER_B_EMAIL",
      "E2E_USER_B_PASSWORD",
    ],
  );
  assert.doesNotMatch(publisher, /E2E_USER_A_|GITHUB_OUTPUT|set-output/);
  assert.doesNotMatch(ephemeralAccounts, /GITHUB_OUTPUT|set-output/);

  const stateType = blockBetween(
    ephemeralAccounts,
    "type RunnerState =",
    "type VisualSourceName",
  );
  const stateWrite = blockBetween(
    ephemeralAccounts,
    'activeStage = "state-write"',
    'activeStage = "credential-publish"',
  );
  for (const stateSource of [stateType, stateWrite]) {
    assert.doesNotMatch(
      stateSource,
      /email|password|accessToken|refreshToken|adminKey|credential/i,
    );
  }
  assert.match(ephemeralAccounts, /writeFile\([\s\S]*?mode: 0o600/);
  assert.equal(
    [...ephemeralAccounts.matchAll(/process\.stdout\.write\(/g)].length,
    3,
  );
  assert.doesNotMatch(
    ephemeralAccounts,
    /process\.(?:stdout|stderr)\.write\([^\n]*(?:email|password|accessToken|refreshToken|adminKey)/i,
  );
});

test("exact cleanup metadata is bounded and never participates in authorization", () => {
  for (const contract of [
    /S232H2_EPHEMERAL_SUITE = "s232h2-production-v3-visual"/,
    /S232H2_EPHEMERAL_MARKER_VERSION = 1/,
    /S232H2_AUTH_PAGE_SIZE = 100/,
    /S232H2_AUTH_MAX_PAGES = 10/,
    /S232H2_STALE_MAX_USERS = 20/,
    /S232H2_STALE_AFTER_MS = 6 \* 60 \* 60 \* 1_000/,
    /S232H2_CURRENT_MAX_USERS = 2/,
  ]) {
    assert.match(ephemeralAccounts, contract);
  }
  const markerParser = blockBetween(
    ephemeralAccounts,
    "function parseExactMarker",
    "export function isExactS232h2MarkerUser",
  );
  for (const key of [
    "version",
    "suite",
    "repository",
    "pr_number",
    "head_sha",
    "run_id",
    "run_attempt",
    "role",
    "created_at",
  ]) {
    assert.ok(markerParser.includes(`"${key}"`), `marker omits ${key}`);
  }
  assert.match(markerParser, /user\.app_metadata\?\.s232h2_test/);
  assert.match(markerParser, /candidate\.repository/);
  assert.match(markerParser, /candidate\.pr_number/);
  assert.match(markerParser, /candidate\.head_sha/);
  assert.match(markerParser, /candidate\.role !== "primary"/);
  assert.match(markerParser, /candidate\.role !== "isolation"/);
  assert.match(markerParser, /expectedEmail\.test\(user\.email\)/);
  assert.match(markerParser, /Math\.abs\(authCreatedAt - markerCreatedAt\)/);

  const authScan = blockBetween(
    ephemeralAccounts,
    "async function listBoundedAuthUsers",
    "async function runReadOnlyCompatibilityProbe",
  );
  assert.match(
    authScan,
    /page <= S232H2_AUTH_MAX_PAGES[\s\S]*?perPage: S232H2_AUTH_PAGE_SIZE/,
  );
  assert.match(authScan, /S232H2_AUTH_SCAN_BOUND_EXHAUSTED/);
  const staleCleanup = blockBetween(
    ephemeralAccounts,
    "async function cleanupStaleMarkedUsers",
    "async function currentRunUsers",
  );
  assert.match(staleCleanup, /parseExactMarker\(user\)/);
  assert.match(staleCleanup, /!isCurrentRunMarker\(marker, config\)/);
  assert.match(staleCleanup, />= S232H2_STALE_AFTER_MS/);
  assert.match(staleCleanup, /stale\.length > S232H2_STALE_MAX_USERS/);

  const cleanupUser = blockBetween(
    ephemeralAccounts,
    "async function cleanupMarkedUser",
    "async function cleanupStaleMarkedUsers",
  );
  assert.match(cleanupUser, /if \(!isExactS232h2MarkerUser\(user\)\)/);
  assert.doesNotMatch(spec, /app_metadata|s232h2_test/);
  assert.doesNotMatch(exactFixture, /app_metadata|s232h2_test/);
});

test("provisioning and cleanup prove the exact graph, JWT boundary, and deletion", () => {
  const createUser = blockBetween(
    ephemeralAccounts,
    "async function createMarkedUser",
    "async function insertRows",
  );
  assert.match(createUser, /auth\.admin\.createUser\(/);
  assert.match(createUser, /email_confirm: true/);
  assert.match(createUser, /app_metadata: \{ s232h2_test: marker \}/);
  assert.match(createUser, /parseExactMarker\(result\.data\.user\)/);

  const seed = blockBetween(
    ephemeralAccounts,
    "async function seedFixtureGraph",
    "function canonicalJson",
  );
  assert.match(seed, /buildExactPrimaryFixtureGraph\(primary\.id, timestamp\)/);
  assert.match(seed, /\[primary, isolation\]\.map/);
  assert.match(seed, /invite_status: "active"/);
  assert.match(seed, /entitlement_tier: "core"/);
  assert.match(seed, /\[\.\.\.graph\.items, isolationCanary\.row\]/);

  const adminVerify = blockBetween(
    ephemeralAccounts,
    "async function verifyAdminFixtureGraph",
    "function requirePreviewConfig",
  );
  for (const family of [
    "PRIMARY_ITEMS_NOT_EXACT",
    "PRIMARY_NOTES_NOT_EXACT",
    "PRIMARY_TAGS_NOT_EXACT",
    "PRIMARY_RECURRENCE_NOT_EXACT",
    "PRIMARY_QUEUE_NOT_EXACT",
    "PRIMARY_SIGNALS_NOT_EXACT",
    "PRIMARY_USAGE_NOT_EXACT",
    "PRIMARY_UNRELATED_ROWS_PRESENT",
    "ISOLATION_CANARY_NOT_EXACT",
    "ISOLATION_GRAPH_OVERGROWN",
  ]) {
    assert.ok(adminVerify.includes(`S232H2_${family}`), `missing ${family}`);
  }
  const previewVerify = blockBetween(
    ephemeralAccounts,
    "async function createPreviewSession",
    "async function writeRunnerState",
  );
  assert.match(previewVerify, /context\.post\("\/api\/auth\/sign-in"/);
  assert.match(previewVerify, /context\.get\("\/api\/auth\/session"/);
  assert.match(previewVerify, /"\/api\/os\/visual-source-audit"/);
  assert.match(previewVerify, /body\.truncated\[name\] !== false/);
  assert.match(previewVerify, /const ownerVisible = await readRlsProbe/);
  assert.match(previewVerify, /const primaryHidden = await readRlsProbe/);
  assert.match(previewVerify, /if \(!ownerVisible \|\| primaryHidden\)/);
  assert.match(previewVerify, /canonicalStableSnapshot\(primaryBefore\)/);
  assert.match(previewVerify, /canonicalStableSnapshot\(primaryAfter\)/);

  const provision = blockBetween(
    ephemeralAccounts,
    "async function provision",
    "async function cleanup",
  );
  const orderedStages = [
    "compatibility-probe",
    "stale-cleanup",
    "account-create",
    "fixture-seed",
    "admin-fixture-verify",
    "preview-jwt-audit",
    "state-write",
    "credential-publish",
  ];
  let previous = -1;
  for (const stage of orderedStages) {
    const index = provision.indexOf(`activeStage = "${stage}"`);
    assert.ok(index > previous, `provision stage is out of order: ${stage}`);
    previous = index;
  }
  assert.equal([...provision.matchAll(/newCredential\(/g)].length, 2);
  assert.match(provision, /newCredential\("primary", config\)/);
  assert.match(provision, /newCredential\("isolation", config\)/);

  const revoke = blockBetween(
    ephemeralAccounts,
    "export async function revokeAllSessions",
    "export async function confirmAccountCleanup",
  );
  assert.match(revoke, /auth\.admin\.updateUserById/);
  assert.match(revoke, /auth\.signInWithPassword/);
  assert.match(revoke, /maskImmediately\(accessToken\)/);
  assert.match(revoke, /maskImmediately\(refreshToken\)/);
  assert.match(revoke, /auth\.admin\.signOut\(accessToken, "global"\)/);
  assert.match(revoke, /auth\.refreshSession/);
  assert.match(revoke, /S232H2_SESSION_REVOCATION_UNCONFIRMED/);

  const deleteUser = blockBetween(
    ephemeralAccounts,
    "async function cleanupMarkedUser",
    "async function cleanupStaleMarkedUsers",
  );
  const deleteOrder = [
    "deleteItemChildren(client, \"wrong_answer_notes\"",
    "deleteItemChildren(client, \"wrong_answer_tags\"",
    "USER_TABLES_IN_SAFE_DELETE_ORDER",
    "deleteByUser(client, \"profiles\"",
    "auth.admin.deleteUser(user.id, false)",
    "confirmAccountCleanup(client, user.id)",
  ];
  previous = -1;
  for (const operation of deleteOrder) {
    const index = deleteUser.indexOf(operation);
    assert.ok(index > previous, `cleanup is out of order: ${operation}`);
    previous = index;
  }
  assert.match(ephemeralAccounts, /confirmed\.count !== 0/);
  assert.match(ephemeralAccounts, /auth\.admin\.getUserById\(userId\)/);
  assert.match(ephemeralAccounts, /remaining\.length !== 0/);
  assert.match(ephemeralAccounts, /if \(!stateMatches\)/);
});

test("provision failure preserves only its first stable stage and code", () => {
  const stableCode = blockBetween(
    ephemeralAccounts,
    "function stableFailureCode",
    "function assertSafeScalar",
  );
  assert.match(stableCode, /error instanceof SafeFailure/);
  assert.match(stableCode, /\^S232H2_\[A-Z0-9_\]\+\$/);
  assert.match(stableCode, /S232H2_UNEXPECTED_FAILURE/);
  assert.doesNotMatch(stableCode, /stack|cause|response|url|email|password/i);

  const cli = blockBetween(
    ephemeralAccounts,
    "async function runCli",
    "const isDirectExecution",
  );
  assert.match(cli, /catch \(error\)/);
  assert.match(cli, /const failedStage = activeStage/);
  assert.match(cli, /activeStage = "provision-failure-cleanup"/);
  assert.match(cli, /activeStage = failedStage;\s*throw error/);
  assert.doesNotMatch(cli, /S232H2_PROVISION_FAILED/);

  const directExecution = ephemeralAccounts.slice(
    ephemeralAccounts.indexOf("const isDirectExecution"),
  );
  assert.match(directExecution, /catch\(\(error: unknown\) =>/);
  assert.match(
    directExecution,
    /S232H2_EPHEMERAL_FAILED:\$\{activeStage\}:\$\{stableFailureCode\(error\)\}/,
  );
});

test("browser and provisioner reuse one exact synthetic fixture grammar", () => {
  assert.match(
    spec,
    /from "\.\.\/\.\.\/scripts\/support\/s232h2-exact-fixture"/,
  );
  assert.match(
    ephemeralAccounts,
    /from "\.\/support\/s232h2-exact-fixture"/,
  );
  for (const contract of [
    /export function exactFixtureGeneratedArtifacts/,
    /export function exactFixtureInput/,
    /export function exactFixtureProductionMetadata/,
    /export function buildExactFixtureLearningSignal/,
    /export function buildExactPrimaryFixtureGraph/,
    /const ledger = buildFixtureItem\(userId, "ledger", now\)/,
    /const queueAnchor = buildFixtureItem\(userId, "queue-anchor", now\)/,
  ]) {
    assert.match(exactFixture, contract);
  }
  assert.match(spec, /buildExactFixtureLearningSignal/);
  assert.match(spec, /exactFixtureGeneratedArtifacts/);
  assert.match(ephemeralAccounts, /buildExactPrimaryFixtureGraph/);
});

test("workflow preserves failure PNGs only after the privacy gate proves isolation", () => {
  const failureUpload = blockBetween(
    workflow,
    "Upload bounded synthetic PNG diagnostics after visual gate failure",
    "Recheck both exact deployment SHAs",
  );
  assert.match(
    failureUpload,
    /failure\(\) && steps\.privacy_gate\.outcome == 'success' && steps\.visual_gate\.outcome == 'failure'/,
  );
  for (const fileName of [
    "s232h2-after-ledger-390.png",
    "s232h2-figma-mobile-ledger-56-2.png",
    "s232h2-after-ledger-1440.png",
    "s232h2-figma-desktop-ledger-59-62.png",
    "s232h2-after-calculator-390.png",
    "s232h2-figma-mobile-calculator-57-34.png",
  ]) {
    assert.ok(failureUpload.includes(`test-results/**/${fileName}`));
  }
  assert.equal(
    [...failureUpload.matchAll(/test-results\/\*\*\/s232h2-[a-z0-9-]+\.png/g)]
      .length,
    6,
  );
  assert.match(failureUpload, /retention-days: 7/);
  assert.doesNotMatch(
    failureUpload,
    /s232h2-\*\.png|manifest|trace\.zip|\.webm|playwright-report|VISUAL_PROOF|EPHEMERAL_STATE|GITHUB_ENV|SUPABASE|EMAIL|PASSWORD/,
  );
  assert.doesNotMatch(
    workflow,
    /test-results\/\*\*\/\*\.png|trace\.zip|playwright-report/,
  );
});

test("spec exposes bounded source, accessibility, and visual gates", () => {
  for (const tag of ["@privacy", "@a11y", "@visual"]) {
    assert.match(
      spec,
      new RegExp(`test\\(\\s*[\\"'\\x60][^\\"'\\x60]*${tag}`),
      `missing ${tag} Playwright gate`,
    );
  }
  assert.match(spec, /test\.use\(\{[\s\S]*?video: "off"/);
  assert.match(spec, /test\.use\(\{[\s\S]*?screenshot: "off"/);
  assert.match(spec, /test\.use\(\{[\s\S]*?trace: "off"/);
  assert.doesNotMatch(spec, /1_500_000/);
  assert.doesNotMatch(spec, /S232H2_PREFLIGHT_OPEN/);

  const boundedTests = [
    {
      source: blockBetween(
        spec,
        'test("@privacy',
        'test("@a11y S232H.2 split accessibility gate',
      ),
      outerSeconds: 180,
    },
    {
      source: blockBetween(
        spec,
        'test("@a11y S232H.2 split accessibility gate',
        'test("@visual',
      ),
      outerSeconds: 720,
    },
    { source: spec.slice(spec.indexOf('test("@visual')), outerSeconds: 900 },
  ];
  for (const bounded of boundedTests) {
    const match = bounded.source.match(/test\.setTimeout\(([\d_]+)\)/);
    assert.ok(match, "each remote gate must declare its own timeout");
    const milliseconds = Number(match[1].replaceAll("_", ""));
    assert.ok(milliseconds > 0);
    assert.ok(
      milliseconds < bounded.outerSeconds * 1_000,
      "the shell bound must retain cleanup and reporter headroom",
    );
  }

  const a11yTestSources = [
    blockBetween(
      spec,
      'test("@a11y S232H.2 deterministic focus-origin micro-fixture',
      'test("@privacy',
    ),
    blockBetween(
      spec,
      'test("@a11y S232H.2 split accessibility gate',
      'test("@visual',
    ),
  ];
  const a11yTimeouts = a11yTestSources.map((source) => {
    const matches = [...source.matchAll(/test\.setTimeout\(([\d_]+)\)/g)];
    assert.equal(matches.length, 1);
    return Number(matches[0][1].replaceAll("_", ""));
  });
  assert.equal(a11yTimeouts.length, 2);
  assert.ok(
    a11yTimeouts.reduce((total, timeout) => total + timeout, 0) < 720_000,
    "all @a11y test bounds must retain aggregate shell headroom",
  );
});

test("privacy source gate selects the first clean candidate in exact priority", () => {
  const candidates = blockBetween(
    spec,
    "const visualCredentialCandidates",
    "async function auditVisualAccountCandidate",
  );
  let previous = -1;
  for (const name of [
    "E2E_VISUAL_USER_EMAIL",
    "E2E_VISUAL_USER_PASSWORD",
    "E2E_USER_B_EMAIL",
    "E2E_USER_B_PASSWORD",
  ]) {
    const index = candidates.indexOf(name);
    assert.ok(index > previous, `credential priority is not exact: ${name}`);
    previous = index;
  }
  assert.doesNotMatch(candidates, /E2E_USER_A_(?:EMAIL|PASSWORD)/);
  assert.match(spec, /visualCredentialCandidates\.length !== 2/);
  assert.doesNotMatch(spec, /\bprocess\.env\.E2E_USER_EMAIL\b/);
  assert.doesNotMatch(spec, /\bprocess\.env\.E2E_USER_PASSWORD\b/);

  const selection = blockBetween(
    spec,
    "function selectCleanVisualAccount",
    "function safeProofIds",
  );
  assert.match(
    selection,
    /for \(const credential of visualCredentialCandidates/,
  );
  assert.doesNotMatch(selection, /console\.(?:log|info|warn|error)/);
  const candidateHandle = blockBetween(
    spec,
    "async function openCandidateHandle",
    "function selectCleanVisualAccount",
  );
  assert.match(candidateHandle, /newPreviewContext\(browser, runtimeBaseUrl\)/);
  assert.match(candidateHandle, /auditVisualAccountCandidate/);
  assert.match(spec, /nonFixtureRowCount === 0/);
  const privacyTest = blockBetween(spec, "@privacy", "@a11y");
  assert.match(
    privacyTest,
    /finally \{[\s\S]*?handles\.map[\s\S]*?handle\.context\.close\(\)[\s\S]*?stableStep: "cleanup"/,
  );
  assert.doesNotMatch(
    privacyTest,
    /handle\.context\.close\(\)\.catch\(\(\) => undefined\)/,
  );
  assert.match(privacyTest, /cleanupFailures\.length > 0/);
  assert.match(privacyTest, /unlink\(visualProofPath\)/);
});

test("privacy source audit is read-only, complete, and screenshot-free", () => {
  assert.match(spec, /"\/api\/auth\/session"/);
  assert.match(spec, /"\/api\/os\/visual-source-audit"/);
  assert.match(spec, /readVisualSourceSnapshot/);
  assert.match(spec, /readVisualEndpointAudit/);
  for (const endpoint of [
    "/api/os/items?limit=501",
    "/api/os/study-logs?mode=second&limit=501",
    "/api/os/review-queue",
    "/api/os/today-focus?mode=second",
    "/api/os/weekly-summary?mode=second",
  ]) {
    assert.ok(spec.includes(endpoint), `missing source GET audit: ${endpoint}`);
  }
  assert.match(spec, /endpointReadSucceeded/);
  assert.match(spec, /visualSourceNames\.every/);
  assert.match(spec, /observed\.truncated\[name\] === false/);
  assert.match(spec, /listedItems\.length < 501/);
  assert.match(spec, /logs\.length < 501/);
  assert.match(spec, /unknownLearnerEndpointCount/);
  assert.match(spec, /unknownLearnerRowCount/);
  assert.match(spec, /sameStringSequenceMembers/);
  assert.match(spec, /endpointItems\.length === endpointItemIds\.length/);
  assert.match(spec, /weeklySummary === null/);
  assert.match(spec, /recoveryTask && knownQueueCard\(recoveryTask\)/);
  assert.match(spec, /S232H2_UNKNOWN_ENDPOINT/);
  assert.match(spec, /S232H2_UNKNOWN_ROW/);
  assert.doesNotMatch(
    spec,
    /context\(\)\.request\.post\(\s*["']\/api\/os\/items|request\.post\(\s*["']\/api\/os\/items/,
  );
  assert.doesNotMatch(spec, /postSyntheticItem|ensureSyntheticLedgerFixture/);

  assert.match(sourceAuditRoute, /process\.env\.VERCEL_ENV !== "preview"/);
  assert.match(sourceAuditRoute, /x-s232h2-audit-sha/);
  assert.match(sourceAuditRoute, /process\.env\.VERCEL_GIT_COMMIT_SHA/);
  assert.match(sourceAuditRoute, /createSupabaseServerClient/);
  assert.match(sourceAuditRoute, /supabase\.auth\.getUser/);
  for (const table of [
    "wrong_answer_items",
    "wrong_answer_notes",
    "wrong_answer_tags",
    "recurrence_features",
    "review_queue_items",
    "study_logs",
    "weekly_learning_summaries",
    "learning_signal_events",
    "usage_events",
    "action_seeds",
    "study_profiles",
    "personal_concept_nodes",
  ]) {
    assert.ok(sourceAuditRoute.includes(`.from("${table}")`));
  }
  assert.doesNotMatch(
    sourceAuditRoute,
    /createSupabaseAdminClient|reviewOsRepository|\.insert\(|\.update\(|\.upsert\(|\.delete\(/,
  );
  assert.match(sourceAuditRoute, /AUDIT_ROW_LIMIT = 501/);
  assert.match(sourceAuditRoute, /rlsProbeVisible/);
  assert.match(sourceAuditRoute, /post_save_execution_started/);
  assert.match(sourceAuditRoute, /review_followup_scheduled/);
  assert.match(spec, /"studyProfiles"/);
  assert.match(spec, /"conceptNodes"/);
  const canonicalRows = blockBetween(
    spec,
    "function canonicalSourceRows",
    "function sourceFingerprint",
  );
  assert.doesNotMatch(canonicalRows, /new Set/);
  assert.doesNotMatch(canonicalRows, /omittedKeys|\.filter\(/);

  const privacyTest = blockBetween(spec, "@privacy", "@a11y");
  assert.doesNotMatch(privacyTest, /page\.screenshot\(/);
  assert.match(privacyTest, /screenshotCallCount:\s*0/);
  assert.match(privacyTest, /scheduledCandidates/);
  assert.match(privacyTest, /completedAudits/);
  assert.match(privacyTest, /notRunCount:\s*0/);
  assert.equal(
    [...privacyTest.matchAll(/cleanVisualAccountRequired\(\)/g)].length,
    2,
    "the clean-account code is reserved for missing candidates or no clean selection",
  );
  assert.doesNotMatch(
    blockBetween(
      spec,
      'test("@a11y S232H.2 split accessibility gate',
      'test("@visual',
    ),
    /cleanVisualAccountRequired\(\)/,
  );
  assert.doesNotMatch(
    spec.slice(spec.indexOf('test("@visual')),
    /cleanVisualAccountRequired\(\)/,
  );
  assert.match(spec, /S232H2_VISUAL_PROOF_CONTRACT_REQUIRED/);
  assert.match(privacyTest, /S232H2_CROSS_ACCOUNT_GATE_OPEN/);
});

test("exact-SHA Preview read mode suppresses every visual GET side effect", () => {
  assert.match(readOnlyRequest, /process\.env\.VERCEL_ENV !== "preview"/);
  assert.match(readOnlyRequest, /process\.env\.VERCEL_GIT_COMMIT_SHA/);
  assert.match(readOnlyRequest, /x-s232h2-audit-sha/);
  assert.match(
    readOnlyRequest,
    /requestHeaders\.get\(AUDIT_SHA_HEADER\) === deploymentSha/,
  );
  assert.match(reviewOsRepository, /async readAccess[\s\S]*?\.select\(/);
  const readAccess = blockBetween(
    reviewOsRepository,
    "async readAccess",
    "async getStudyProfile",
  );
  assert.doesNotMatch(
    readAccess,
    /\.insert\(|\.update\(|\.upsert\(|\.delete\(/,
  );
  assert.match(reviewOsServer, /isPreviewExactShaReadOnlyRequest/);
  assert.match(reviewOsServer, /reviewOsRepository\.readAccess/);
  for (const method of [
    "getReviewQueue",
    "getTodayFocus",
    "getWeeklyPlan",
    "getWeeklySummary",
  ]) {
    const start = reviewOsService.indexOf(`async ${method}`);
    const next = reviewOsService.indexOf("\n  async ", start + 8);
    const body = reviewOsService.slice(start, next < 0 ? undefined : next);
    assert.ok(start >= 0, `missing read-only service method: ${method}`);
    assert.match(body, /isPreviewExactShaReadOnlyRequest/);
    assert.match(body, /if \(readOnlyRequest\)/);
  }
});

test("privacy proof is mode-0600, value-free, fail-fast, and RLS-negative", () => {
  assert.match(spec, /S232H2_VISUAL_PROOF_PATH/);
  assert.match(spec, /writeFile\([\s\S]*?mode:\s*0o600/);
  assert.match(spec, /selectedSlot/);
  assert.match(spec, /selectedFingerprint/);
  assert.match(spec, /sourceFingerprint/);
  assert.match(spec, /snapshotReadSucceeded/);
  assert.match(spec, /snapshotStable/);
  assert.match(spec, /crossAccountDenied/);
  assert.match(spec, /deniedCanaryDomCount/);
  assert.match(spec, /fixtureOwnershipClosed/);
  assert.match(spec, /targetSessionBound/);
  assert.match(spec, /baselineSessionBound/);
  assert.match(spec, /baselineUsesSelectedFixture/);
  assert.match(spec, /ownerRead/);
  assert.match(spec, /const denied =/);
  assert.match(spec, /deniedCanary/);
  assert.match(
    spec,
    /S232H2_CLEAN_VISUAL_ACCOUNT_REQUIRED E2E_VISUAL_USER_EMAIL E2E_VISUAL_USER_PASSWORD/,
  );
  const cleanAccountErrorStart = spec.indexOf(
    "S232H2_CLEAN_VISUAL_ACCOUNT_REQUIRED",
  );
  const cleanAccountError = spec.slice(
    cleanAccountErrorStart,
    cleanAccountErrorStart + 220,
  );
  assert.doesNotMatch(
    cleanAccountError,
    /E2E_USER_[AB]_(?:EMAIL|PASSWORD)|error\.message|JSON\.stringify/,
  );
  assert.doesNotMatch(spec, /selectedSlot:\s*candidate\.(?:email|password)/);
});

test("dirty-account substring policy and real persistence are disconnected", () => {
  for (const forbidden of [
    /screenshot-boundary-policy/,
    /createScreenshotDataBoundary/,
    /collectNestedLearnerContent/,
    /addScreenshotBoundaryFragment/,
    /screenshotDataBoundaryFingerprint/,
    /fragmentDescriptors/,
    /unrestrictedFragments/,
    /sensitiveFragments/,
    /buildScreenshotBoundaryPolicyTable/,
    /collectSyntheticPayloadFailurePaths/,
    /historical-synthetic-fixtures/,
    /NodeFilter\.SHOW_TEXT/,
    /S232H2_SCREENSHOT_BOUNDARY_OPEN/,
  ]) {
    assert.doesNotMatch(spec, forbidden);
  }
  assert.match(spec, /installDeterministicVisualMocks/);
  assert.match(spec, /route\.fulfill\(/);
  assert.match(spec, /blockUnexpectedLearnerMutation/);
  assert.match(spec, /fixtureOwnershipClosed/);
  assert.match(spec, /identityMasked/);
  assert.match(spec, /rawIdentityArtifactCount/);
  assert.match(spec, /actualAccountArtifactCount/);
  assert.match(spec, /exactFixturePayloadClosed/);
  assert.match(spec, /exactFixtureLearningSignal/);
  assert.match(exactFixture, /export function exactFixtureGeneratedArtifacts/);
  assert.match(exactFixture, /export function exactFixtureProductionMetadata/);
  assert.match(spec, /canonicalCaptureFixtureProjection/);
  assert.match(spec, /captureFixtureTimingClosed/);
  assert.match(spec, /derived\.recurrenceCount === 1/);
  assert.match(spec, /second_stage_weak_paragraph_48h/);
  assert.match(spec, /derivedPayload\.retryDueAt !== null/);
  assert.match(spec, /derivedPayload\.followUpReviewAt !== null/);
  assert.match(spec, /fixtureMultiplicityClosed/);
  assert.match(spec, /usageMultiplicityClosed/);
  assert.match(
    spec,
    /privateLearnerContentCaptured:\s*actualAccountArtifactCount !== 0/,
  );
});

test("a11y runs full mobile, lightweight wide geometry, and bounded keyboard profiles", () => {
  for (const route of requiredRoutes) {
    assert.ok(spec.includes(route), `missing production route: ${route}`);
  }
  for (const width of [390, 768, 1440]) {
    assert.ok(spec.includes(`width: ${width}`), `missing viewport: ${width}`);
  }
  assert.match(spec, /"mobile-full"/);
  assert.match(spec, /"geometry"/);
  assert.match(spec, /mobileFullScheduled/);
  assert.match(spec, /mobileFullCompleted/);
  assert.match(spec, /geometryScheduled/);
  assert.match(spec, /geometryCompleted/);
  assert.match(spec, /keyboardScheduled/);
  assert.match(spec, /keyboardCompleted/);
  assert.match(spec, /scheduledCandidates:\s*45/);
  assert.match(spec, /completedAudits/);
  assert.match(spec, /new AxeBuilder/);
  assert.match(spec, /serious.*critical/s);
  assert.match(spec, /horizontalOverflow/);
  assert.match(spec, /visibleH1Count/);
  assert.match(spec, /targetRect\.width >= 44 && targetRect\.height >= 44/);
  assert.match(spec, /viewportBoundsFailureCount/);

  const a11yTest = blockBetween(spec, "@a11y", "@visual");
  const initialMatrix = blockBetween(
    a11yTest,
    "for (const route of requiredRoutes)",
    "const dynamicCandidates",
  );
  assert.ok(
    initialMatrix.indexOf("for (const route of requiredRoutes)") <
      initialMatrix.indexOf("for (const viewport of viewports)"),
  );
  assert.match(
    initialMatrix,
    /let routePrepared = false[\s\S]*?const requiresRouteNavigation =\s*!routePrepared \|\| requiresCalculatorWideReset/,
  );
  assert.match(
    initialMatrix,
    /requiresCalculatorWideReset[\s\S]*?CALCULATOR_ROUTINE_SESSION_STORAGE_PREFIX/,
  );
  assert.match(
    initialMatrix,
    /routePrepared = false;[\s\S]*?await prepareInitialRoute[\s\S]*?routePrepared = true/,
  );
  assert.match(
    initialMatrix,
    /else \{[\s\S]*?setViewportSize[\s\S]*?waitForStableRender/,
  );
  assert.match(
    initialMatrix,
    /await settleRuntimeMonitors\(routePage\);[\s\S]*?auditRows\.push\(row\)/,
  );
  const initialFinally = initialMatrix.slice(
    initialMatrix.lastIndexOf("} finally {"),
  );
  assert.doesNotMatch(initialFinally, /settleRuntimeMonitors/);
  assert.match(initialFinally, /removeKeyboardTraversalOrigin/);
  assert.match(a11yTest, /mobileFullScheduled:\s*19/);
  assert.match(a11yTest, /geometryScheduled:\s*26/);
  assert.match(a11yTest, /keyboardScheduled:\s*3/);
  assert.match(a11yTest, /route\.id === "today" \|\| route\.id === "ledger"/);
  assert.match(
    a11yTest,
    /dynamic\.routeId === "answer-review"[\s\S]*?dynamic\.state === "rewrite"/,
  );
  assert.doesNotMatch(
    a11yTest,
    /for[^\n]*requiredRoutes[\s\S]{0,300}?verifyKeyboardFocus/,
  );
});

test("skip-link, public landmark, and login focus contracts are capability-based", () => {
  const capabilities = blockBetween(
    spec,
    "async function inspectShellCapabilities",
    "async function auditRoute",
  );
  assert.match(capabilities, /data-learner-shell/);
  assert.match(capabilities, /data-answer-review-stage/);
  assert.match(capabilities, /data-standalone-learner-tool-nav/);
  assert.match(capabilities, /input\[type="email"\]/);
  assert.match(capabilities, /input\[type="password"\]/);
  assert.match(capabilities, /button\[type="submit"\]/);
  assert.doesNotMatch(capabilities, /route(?:Id|Alias|\.id)|"home"|"login"/);
  assert.match(spec, /"learner-shell"/);
  assert.match(spec, /"standalone-tool"/);
  assert.match(spec, /"public"/);
  assert.match(spec, /"login-form"/);
  assert.match(spec, /a\[data-v3-skip-link\]/);
  assert.match(spec, /S232H2_SKIP_LINK_COUNT_INVALID/);
  assert.match(
    spec,
    /capabilities\.requiresSkipLink && capabilities\.skipLinkCount !== 1/,
  );
  assert.match(spec, /const visibleH1Count =[\s\S]*?visibleH1Count !== 1/);
  assert.match(
    spec,
    /capabilities\.kind === "login-form"[\s\S]*?auditLoginFormFocus/,
  );
  assert.match(capabilities, /learnerShell > 0 \|\| answerReviewShell > 0/);
  assert.match(capabilities, /structureValid/);
  assert.match(spec, /!capabilities\.structureValid/);
});

test("dynamic candidates use fresh contexts, deterministic mocks, and finally cleanup", () => {
  const dynamic = blockBetween(
    spec,
    "async function runIsolatedDynamicCandidate",
    "async function runVisualCandidate",
  );
  assert.match(dynamic, /newPreviewContext\(browser, runtimeBaseUrl\)/);
  assert.match(dynamic, /installDeterministicVisualMocks/);
  assert.match(spec, /route\.fallback\(\)/);
  assert.match(spec, /request\.method\(\) !== "POST"/);
  assert.match(spec, /searchParams\.keys/);
  assert.match(spec, /postDataBuffer/);
  assert.match(dynamic, /phase: "a11y" \| "visual"/);
  assert.match(dynamic, /phase,/);
  assert.match(dynamic, /try \{/);
  assert.match(
    dynamic,
    /finally \{[\s\S]*?unrouteAll\(\{ behavior: "wait" \}\)[\s\S]*?context\.close\(\)/,
  );
  assert.doesNotMatch(dynamic, /sharedPage|sharedContext/);
  for (const state of [
    "capture-extraction-preview",
    "answer-review-result",
    "answer-review-rewrite",
    "review-revealed-selected",
    "session-saved-capture",
    "calculator-completed-saved",
  ]) {
    assert.ok(spec.includes(state), `missing isolated dynamic state: ${state}`);
  }
});

test("failure records are stable metadata and distinguish snapshot read from drift", () => {
  assert.match(spec, /phase/);
  assert.match(spec, /routeStateAlias/);
  assert.match(spec, /viewport/);
  assert.match(spec, /stableStep/);
  assert.match(spec, /errorFamily/);
  assert.match(spec, /"snapshot-read-failed"/);
  assert.match(spec, /"snapshot-drift"/);
  assert.match(spec, /snapshotReadSucceeded/);
  assert.match(spec, /snapshotStable/);
  const closure = blockBetween(
    spec,
    "const snapshotReadSucceeded = Boolean",
    "const diagnosticActualNames",
  );
  assert.match(
    closure,
    /if \(!snapshotReadSucceeded\)[\s\S]*?stableStep: "snapshot-read"[\s\S]*?errorFamily: "snapshot-read-failed"/,
  );
  assert.match(closure, /else if \(!snapshotStable\)/);
  assert.match(
    closure,
    /privacyClosureOpen[\s\S]*?"snapshot-read"[\s\S]*?"snapshot-drift"/,
  );
  const failureRecord = blockBetween(
    spec,
    "type StableGateFailure",
    "type ScreenshotEvidence",
  );
  assert.doesNotMatch(
    failureRecord,
    /message|stack|dom|text|email|itemId|userId|response|url/i,
  );
  const recorder = blockBetween(
    spec,
    "function recordStableGateFailure",
    "function stableErrorFamily",
  );
  assert.doesNotMatch(
    recorder,
    /error\.message|error\.stack|JSON\.stringify\(error/,
  );
});

test("visual gate is a single prepare-inspect-screenshot pass with post-read closure", () => {
  const visualCandidate = blockBetween(
    spec,
    "async function runVisualCandidate",
    "async function compareScreenshotToFigmaReference",
  );
  const prepareIndex = visualCandidate.indexOf("await prepare()");
  const inspectIndex = visualCandidate.indexOf("captureSyntheticScreenshot(");
  const cleanupIndex = visualCandidate.indexOf("finally {");
  assert.ok(
    prepareIndex >= 0 &&
      inspectIndex > prepareIndex &&
      cleanupIndex > inspectIndex,
  );
  const capture = blockBetween(
    spec,
    "async function captureSyntheticScreenshot",
    "async function prepareInitialRoute",
  );
  assert.match(
    capture,
    /inspectSyntheticArtifactBoundary[\s\S]*?page\.screenshot\(/,
  );
  assert.equal([...spec.matchAll(/page\.screenshot\(/g)].length, 1);
  assert.doesNotMatch(spec, /runPreflightCandidate|options\.preflight/);
  assert.match(spec, /visualGate[\s\S]*?scheduledCandidates:\s*25/);
  assert.match(spec, /completedAudits/);
  for (const field of [
    "preparationBlockerCount",
    "cleanupBlockerCount",
    "visualBlockerCount",
    "privacyBlockerCount",
  ]) {
    assert.match(spec, new RegExp(`${field}:\\s*0`));
  }
  assert.match(
    spec,
    /let finalAudit[\s\S]*?snapshotReadSucceeded[\s\S]*?snapshotStable[\s\S]*?for \(const screenshot[\s\S]*?writeFile/,
  );
  assert.match(spec, /selectedFingerprint/);
  assert.match(spec, /sourceFingerprint/);
  const visualTest = spec.slice(spec.indexOf('test("@visual'));
  assert.match(visualTest, /verifySessionBinding/);
  assert.match(visualTest, /proof\.selectedSessionFingerprint/);
  assert.match(
    visualTest,
    /targetAudit\?\.fingerprint === proof\.selectedFingerprint/,
  );
  assert.match(visualTest, /sameStringSet\(/);
  for (const family of [
    "items",
    "notes",
    "tags",
    "recurrence",
    "reviewQueue",
    "studyLogs",
    "weeklySummaries",
    "learningSignals",
    "agendaUsage",
    "todaySeeds",
    "studyProfiles",
    "conceptNodes",
  ]) {
    assert.ok(spec.includes(family), `fingerprint omits ${family}`);
  }
});

test("the 45-audit and 28-PNG matrix remains exact", () => {
  assert.match(
    spec,
    /initialAuditRowCount: proof\.auditRows![\s\S]*?auditKind === "initial-route"/,
  );
  assert.match(
    spec,
    /dynamicAuditRowCount: proof\.auditRows![\s\S]*?auditKind === "dynamic-state"/,
  );
  assert.match(spec, /auditRowCount: proof\.auditRows!\.length/);
  assert.match(spec, /beforeScreenshotCount: baselineScreenshots\.length/);
  assert.match(spec, /initialAfterScreenshotCount,/);
  assert.match(spec, /dynamicScreenshotCount:\s*dynamicAfterScreenshotCount/);
  assert.match(spec, /const dynamicScreenshotNames = new Set/);
  assert.match(spec, /afterScreenshotCount: afterScreenshots\.length/);
  assert.match(
    spec,
    /figmaReferenceScreenshotCount: figmaReferenceScreenshots\.length/,
  );
  assert.match(spec, /figmaComparisonCount: figmaComparisons\.length/);
  assert.match(spec, /screenshotCount: screenshotNames\.length/);
  assert.match(spec, /screenshotCallCount,/);
  assert.match(spec, /s232h2-before-ledger-/);
  assert.match(spec, /s232h2-before-calculator-390\.png/);
  assert.match(
    spec,
    /"s232h2-after-" \+ route\.id \+ "-" \+ viewport\.label \+ "\.png"/,
  );
  for (const name of [
    "s232h2-figma-mobile-ledger-56-2.png",
    "s232h2-figma-desktop-ledger-59-62.png",
    "s232h2-figma-mobile-calculator-57-34.png",
  ]) {
    assert.ok(spec.includes(name), `missing evidence PNG: ${name}`);
  }
  assert.match(workflow, /screenshotCount !== 28/);
  assert.match(workflow, /value\.screenshotCallCount !== 25/);
  assert.match(workflow, /a11yGate\.scheduledCandidates !== 45/);
  assert.match(workflow, /a11yGate\.completedAudits !== 45/);
  assert.match(workflow, /visualGate\.scheduledCandidates !== 25/);
  assert.match(workflow, /visualGate\.completedAudits !== 25/);
  assert.match(
    workflow,
    /privacyGate\.completedAudits !== privacyGate\.scheduledCandidates/,
  );
  assert.match(workflow, /privacyGate\.notRunCount !== 0/);
  assert.match(workflow, /privacyGate\.endpointReadSucceeded !== true/);
  assert.match(workflow, /privacyGate\.scheduledCandidates !== 2/);
  assert.match(
    workflow,
    /privacyGate\.selectedExactFixtureCount !== privacyGate\.selectedAccountItemCount/,
  );
  assert.match(workflow, /visualGate\.screenshotCallCount !== 25/);
  assert.match(workflow, /snapshotReadSucceeded !== true/);
  assert.match(workflow, /snapshotStable !== true/);
});

test("manifest and artifacts fail closed on blockers or real-account material", () => {
  assert.match(spec, /schemaVersion:\s*4/);
  assert.match(spec, /privacyGate/);
  assert.match(spec, /a11yGate/);
  assert.match(spec, /visualGate/);
  assert.match(spec, /credentialsRedacted/);
  assert.match(spec, /identityMasked/);
  assert.match(spec, /actualAccountArtifactCount:\s*0/);
  assert.match(
    spec,
    /privateLearnerContentCaptured:\s*actualAccountArtifactCount !== 0/,
  );
  assert.match(spec, /rawInputArtifactCaptured:\s*false/);
  assert.match(spec, /domCaptured:\s*false/);
  assert.match(spec, /traceCaptured:\s*false/);
  assert.match(spec, /videoCaptured:\s*false/);
  assert.match(
    spec,
    /result: figmaComparisons\.every\(\(comparison\) => comparison\.passed\)[\s\S]*?\? "pass"[\s\S]*?: "fail"/,
  );
  assert.match(
    spec,
    /expect\([\s\S]*?visualGate[\s\S]*?completedAudits: 25[\s\S]*?snapshotStable: true/,
  );
  assert.doesNotMatch(spec, /result:\s*["']pass["']/);
  assert.match(workflow, /privacyGate\.blockerCount !== 0/);
  assert.match(workflow, /privacyGate\.targetSessionBound !== true/);
  assert.match(workflow, /privacyGate\.baselineSessionBound !== true/);
  assert.match(workflow, /privacyGate\.baselineUsesSelectedFixture !== true/);
  assert.match(workflow, /a11yGate\.blockerCount !== 0/);
  for (const field of [
    "preparationBlockerCount",
    "cleanupBlockerCount",
    "visualBlockerCount",
    "privacyBlockerCount",
  ]) {
    assert.match(workflow, new RegExp(`visualGate\\.${field} !== 0`));
  }
  assert.match(workflow, /rawIdentityArtifactCount !== 0/);
  assert.match(workflow, /actualAccountArtifactCount !== 0/);
  assert.match(workflow, /forbiddenArtifactKeys/);
  for (const key of [
    "selectedSlot",
    "selectedFingerprint",
    "selectedSessionFingerprint",
    "fixtureIds",
    "ledgerItemId",
    "deniedCanary",
    "sessionUserId",
  ]) {
    assert.ok(workflow.includes(`"${key}"`));
  }
  assert.match(workflow, /\[0-9a-f\]\{64\}/);
  assert.match(workflow, /\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}/);
  assert.match(workflow, /physicalScreenshots\.length !== 28/);
  assert.match(workflow, /s232h2-visual-manifest\.json/);
  assert.match(workflow, /test-results\/\*\*\/s232h2-\*\.png/);
});

test("Figma references remain pinned and hostile comparisons remain direct", () => {
  for (const snapshot of figmaSnapshots) {
    const buffer = readFileSync(`${snapshotDirectory}/${snapshot.file}`);
    assert.deepEqual(pngDimensions(buffer), {
      width: snapshot.width,
      height: snapshot.height,
    });
    assert.equal(
      createHash("sha256").update(buffer).digest("hex"),
      snapshot.sha256,
    );
  }
  for (const snapshotName of [
    "figma-mobile-ledger.png",
    "figma-desktop-ledger.png",
    "figma-mobile-calculator.png",
  ]) {
    assert.ok(
      spec.includes(snapshotName),
      `missing direct Figma snapshot: ${snapshotName}`,
    );
  }
  assert.match(spec, /compareScreenshotToFigmaReference/);
  assert.match(spec, /testInfo\.snapshotPath\(reference\.snapshotName\)/);
  assert.match(spec, /meanColorDelta/);
  assert.match(spec, /nearPixelRatio/);
  assert.match(spec, /edgeGridCorrelation/);
  assert.match(spec, /dilatedEdgeF1/);
  assert.match(spec, /anchorMaxRgbMeanDelta/);
  assert.match(spec, /anchorMinEdgeDensityRatio/);
  assert.match(workflow, /comparison\.passed !== true/);
  assert.match(workflow, /comparison\.meanColorDelta > 0\.18/);
  assert.match(workflow, /comparison\.nearPixelRatio < 0\.5/);
  assert.match(workflow, /comparison\.edgeGridCorrelation < 0\.5/);
  for (const node of [
    "43:2",
    "44:9",
    "45:2",
    "47:28",
    "48:75",
    "50:59",
    "51:44",
    "52:42",
    "53:129",
    "56:2",
    "57:34",
    "59:62",
    "61:2",
    "61:80",
  ]) {
    assert.ok(
      spec.includes(`"${node}"`),
      `missing canonical Figma node: ${node}`,
    );
  }
});
